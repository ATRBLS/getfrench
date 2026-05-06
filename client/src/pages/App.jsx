import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, streamMessage } from '../lib/api';
import { isAuthenticated, getStoredUser, clearAuth } from '../lib/auth';
import { useSpeechRecognition, useSpeechSynthesis, requestMicPermission, unlockAudio } from '../hooks/useSpeech';
import UpgradeModal from '../components/UpgradeModal';
import RecapModal from '../components/RecapModal';
import Logo from '../components/Logo';
import './App.css';

const STATE = { IDLE: 'idle', LISTENING: 'listening', THINKING: 'thinking', SPEAKING: 'speaking' };

const PLAN_LIMITS = {
  free: { sessions: 3, seconds: null },
  starter: { sessions: null, seconds: 14400 },
  pro: { sessions: null, seconds: 36000 },
  unlimited: { sessions: null, seconds: -1 },
};

export default function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [btnState, setBtnState] = useState(STATE.IDLE);
  const [userData, setUserData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showMemoryDot, setShowMemoryDot] = useState(false);
  const [showLowTime, setShowLowTime] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [recapData, setRecapData] = useState(null);
  const [showCefrTip, setShowCefrTip] = useState(false);
  const cefrTipTimerRef = useRef(null);
  const [error, setError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [speed, setSpeed] = useState('normal');
  const [corrMode, setCorrMode] = useState('gentle');
  const [levelMode, setLevelMode] = useState('auto');
  const speedRef = useRef('normal');
  const corrModeRef = useRef('gentle');
  const levelModeRef = useRef('auto');
  const [messages, setMessages] = useState([]);
  const [lastTranscript, setLastTranscript] = useState('');
  const [aiText, setAiText] = useState('');

  const sessionStartRef = useRef(null);
  const timerRef = useRef(null);
  const isActiveRef = useRef(false);
  const messagesRef = useRef([]);
  const listeningRef = useRef(false);       // true only while STT should keep restarting
  const transcriptBufferRef = useRef('');   // accumulates final STT segments across pauses
  const sttDebounceRef = useRef(null);      // 2s silence timer before triggering AI

  const { enqueueSentence, finalize, cancel: cancelSpeech, createAudioSession, closeAudioSession } = useSpeechSynthesis();

  // Client-side speed control via AudioBufferSourceNode.playbackRate.
  // This is the only reliable way to change playback speed — ElevenLabs' own
  // speed param has a negligible effect in practice.
  useEffect(() => {
    window.__gfSpeed = 1.0;
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (window.__gfSpeed !== 1.0) this.playbackRate.value = window.__gfSpeed;
      return orig.apply(this, args);
    };
    return () => { AudioBufferSourceNode.prototype.start = orig; delete window.__gfSpeed; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth', { replace: true });
      return;
    }

    api.getMe().then(user => {
      setUserData(user);
      if (user.memory && Object.keys(user.memory).length > 0) {
        setShowMemoryDot(true);
      }
    }).catch((err) => {
      // Only clear auth on 401 (invalid/expired token).
      // Network errors or CORS failures should not log the user out.
      if (err.status === 401) {
        clearAuth();
        navigate('/auth', { replace: true });
      }
    });
  }, [navigate, searchParams]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getRemainingSeconds = useCallback(() => {
    if (!userData) return null;
    if (userData.plan === 'unlimited') return null;
    if (userData.plan === 'free') return 1200 - elapsed;
    const limit = PLAN_LIMITS[userData.plan]?.seconds || 0;
    return limit - (userData.seconds_used || 0) - elapsed;
  }, [userData, elapsed]);

  const endSession = useCallback(async () => {
    if (!isActiveRef.current) return;
    isActiveRef.current = false;
    listeningRef.current = false;
    clearInterval(timerRef.current);
    clearTimeout(sttDebounceRef.current);
    sttDebounceRef.current = null;
    transcriptBufferRef.current = '';
    cancelSpeech();
    closeAudioSession();

    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const currentMessages = messagesRef.current;

    setBtnState(STATE.IDLE);

    if (sessionId && currentMessages.length > 0) {
      try {
        const summary = await api.summarize({
          messages: currentMessages,
          existing_memory: userData?.memory,
        });
        summary.total_minutes = (userData?.memory?.total_minutes || 0) + Math.floor(duration / 60);
        await api.endSession({ session_id: sessionId, duration_seconds: duration, summary });
        setUserData(prev => ({ ...prev, memory: summary }));
        setShowMemoryDot(true);
        setRecapData(summary);
        setShowRecap(true);
      } catch (err) {
        console.error('Failed to save session:', err);
        await api.endSession({ session_id: sessionId, duration_seconds: duration }).catch(() => {});
      }
    }

    setSessionId(null);
    setElapsed(0);
    setMessages([]);
    messagesRef.current = [];
    sessionStartRef.current = null;
  }, [sessionId, userData, cancelSpeech, closeAudioSession]);

  const handleAIResponse = useCallback(async (userTranscript) => {
    if (!isActiveRef.current) return;
    // Stop STT restart loop and cancel any pending debounce.
    listeningRef.current = false;
    clearTimeout(sttDebounceRef.current);
    sttDebounceRef.current = null;
    setBtnState(STATE.THINKING);
    // Don't clear lastTranscript here — clear it only when speaking starts
    // so the user can see their words during the "thinking" pause.

    const newMessages = [...messagesRef.current, { role: 'user', content: userTranscript }];
    messagesRef.current = newMessages;
    setMessages([...newMessages]);

    let fullResponse = '';
    let sentenceBuffer = '';
    let speakingStarted = false;
    setAiText('');

    // Flush complete sentences from buffer to the TTS queue.
    const flushSentences = (isFinal = false) => {
      const sentenceRe = /[^.!?]*[.!?]+/g;
      let match;
      let lastIndex = 0;
      while ((match = sentenceRe.exec(sentenceBuffer)) !== null) {
        const sentence = match[0].trim();
        if (sentence) {
          if (!speakingStarted) {
            speakingStarted = true;
            setBtnState(STATE.SPEAKING);
            setLastTranscript(''); // clear user text as AI starts speaking
          }
          enqueueSentence(sentence);
        }
        lastIndex = sentenceRe.lastIndex;
      }
      sentenceBuffer = sentenceBuffer.slice(lastIndex);
      if (isFinal && sentenceBuffer.trim()) {
        if (!speakingStarted) {
          speakingStarted = true;
          setBtnState(STATE.SPEAKING);
          setLastTranscript('');
        }
        enqueueSentence(sentenceBuffer.trim());
        sentenceBuffer = '';
      }
    };

    try {
      await streamMessage(newMessages, sessionId, corrModeRef.current, levelModeRef.current, (chunk) => {
        fullResponse += chunk;
        sentenceBuffer += chunk;
        setAiText(fullResponse);
        flushSentences();
      });

      if (!isActiveRef.current) return;

      flushSentences(true); // speak any trailing text without punctuation

      const finalMessages = [...newMessages, { role: 'assistant', content: fullResponse }];
      messagesRef.current = finalMessages;
      setMessages([...finalMessages]);

      if (!speakingStarted) setBtnState(STATE.SPEAKING);

      finalize(() => {
        console.log('[App] finalize callback fired, isActive:', isActiveRef.current);
        if (!isActiveRef.current) return;
        const remaining = getRemainingSeconds();
        if (remaining !== null && remaining <= 300 && !showLowTime) {
          setShowLowTime(true);
        }
        setBtnState(STATE.LISTENING);
        listeningRef.current = true;
        // source.onended fires inside the AudioContext callback — iOS treats it
        // as a trusted audio event so SpeechRecognition.start() works immediately.
        console.log('[App] startListening called, isActive:', isActiveRef.current);
        if (isActiveRef.current) startListening();
      });

    } catch (err) {
      console.error('AI error:', err);
      if (isActiveRef.current) setBtnState(STATE.IDLE);
    }
  }, [sessionId, enqueueSentence, finalize, getRemainingSeconds, showLowTime]);

  const { start: startListening, stop: stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      if (!isActiveRef.current || !listeningRef.current) return;
      // Show the latest segment immediately so the user gets visual feedback.
      setLastTranscript(transcript);
      // Accumulate this final segment and (re)start the 2-second silence timer.
      transcriptBufferRef.current += (transcriptBufferRef.current ? ' ' : '') + transcript;
      clearTimeout(sttDebounceRef.current);
      sttDebounceRef.current = setTimeout(() => {
        sttDebounceRef.current = null;
        const full = transcriptBufferRef.current.trim();
        transcriptBufferRef.current = '';
        if (!full || !isActiveRef.current) return;
        setAiText('');
        handleAIResponse(full);
      }, 2000);
    },
    onEnd: () => {
      // Keep restarting STT while in listening mode (continuous across pauses).
      if (isActiveRef.current && listeningRef.current) startListening();
    },
    onError: (err) => {
      console.error('STT error:', err);
      if (!isActiveRef.current || !listeningRef.current) return;
      if (err === 'no-speech' || err === 'network' || err === 'audio-capture') {
        startListening();
      } else {
        setError(`Microphone error: ${err}`);
      }
    },
  });

  const startSession = useCallback(async () => {
    if (!userData) return;

    // Check limits before starting
    if (userData.plan === 'free' && userData.sessions_this_month >= 3) {
      setShowUpgrade(true);
      return;
    }

    // All three must fire synchronously before any await — iOS Safari only allows
    // audio APIs to be unlocked during the synchronous part of a user gesture.
    unlockAudio();
    createAudioSession();
    await requestMicPermission();

    try {
      const { session_id } = await api.startSession();
      setSessionId(session_id);
      isActiveRef.current = true;
      sessionStartRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // Hard limit at 20 min for free, or remaining seconds for paid
          const remaining = userData.plan === 'free'
            ? 1200 - next
            : (PLAN_LIMITS[userData.plan]?.seconds > 0
              ? PLAN_LIMITS[userData.plan].seconds - (userData.seconds_used || 0) - next
              : Infinity);

          if (remaining <= 0) {
            endSession();
            setShowUpgrade(true);
          }
          return next;
        });
      }, 1000);

      setBtnState(STATE.LISTENING);

      // Kick off first AI turn (AI speaks first)
      const greeting = [];
      messagesRef.current = greeting;

      // Trigger initial AI greeting by sending empty first turn
      await handleAIResponse('Hello');
    } catch (err) {
      if (err.code === 'limit_reached') {
        setShowUpgrade(true);
      } else {
        setError('Failed to start session. Please try again.');
      }
    }
  }, [userData, endSession, handleAIResponse, createAudioSession]);

  const handleButtonClick = useCallback(() => {
    if (!isActiveRef.current) {
      startSession();
    } else {
      endSession();
    }
  }, [startSession, endSession]);

  const remaining = getRemainingSeconds();
  const isSessionActive = !!sessionId;
  const cefrLevel = userData?.memory?.cefr_level;
  const sessionCount = userData?.memory?.session_count || 0;
  const sessionLabel = userData
    ? (sessionCount === 0 ? 'First session' : `Session ${sessionCount + 1}`)
    : '';

  const handleSignOut = () => {
    clearAuth();
    navigate('/');
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.stripePortal();
      window.location.href = url;
    } catch (err) {
      setError('Could not open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    const map = { slow: 0.72, normal: 1.0, fast: 1.35 };
    window.__gfSpeed = map[newSpeed];
  };

  const handleLevelChange = (newLevel) => {
    setLevelMode(newLevel);
    levelModeRef.current = newLevel;
  };

  const handleCorrModeChange = (newMode) => {
    setCorrMode(newMode);
    corrModeRef.current = newMode;
  };

  const handleCefrTap = () => {
    setShowCefrTip(v => !v);
    clearTimeout(cefrTipTimerRef.current);
    cefrTipTimerRef.current = setTimeout(() => setShowCefrTip(false), 3000);
  };

  return (
    <div className="app-page">
      <div className="app-header">
        <div className="header-left">
          <Logo size={28} />
          {sessionLabel && <span className="session-count">{sessionLabel}</span>}
        </div>
        <div className="header-right">
          <button className="cefr-badge" onClick={handleCefrTap} aria-label="CEFR level info">
            ★ {cefrLevel ? `Level ${cefrLevel}` : 'Level ?'}
            {showCefrTip && (
              <span className="cefr-tooltip">
                Your French level — detected after your first session
              </span>
            )}
          </button>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div className="app-center">
        <button
          className={`mic-btn mic-btn--${btnState}`}
          onClick={handleButtonClick}
          aria-label={isSessionActive ? 'End session' : 'Start session'}
        >
          <div className="mic-rings">
            <div className="ring ring-1" />
            <div className="ring ring-2" />
            <div className="ring ring-3" />
          </div>
          <div className="mic-inner">
            {btnState === STATE.IDLE && <MicIcon />}
            {btnState === STATE.LISTENING && <MicIcon />}
            {btnState === STATE.THINKING && <Spinner />}
            {btnState === STATE.SPEAKING && <WaveIcon />}
          </div>
        </button>

        {btnState === STATE.IDLE && (
          <p className="idle-tagline">Tap to start your session</p>
        )}

        {btnState !== STATE.IDLE && (
          <p className="state-label">
            {btnState === STATE.LISTENING && 'Listening...'}
            {btnState === STATE.THINKING && '...'}
            {btnState === STATE.SPEAKING && ''}
          </p>
        )}

        {isSessionActive && remaining !== null && (
          <p className={`time-remaining${remaining < 120 ? ' time-remaining--danger' : remaining < 300 ? ' time-remaining--warning' : ''}`}>
            {formatTime(remaining)} remaining
          </p>
        )}

        {lastTranscript && (
          <p className="transcript-bubble">"{lastTranscript}"</p>
        )}

        {aiText && (
          <p className="ai-text-stream">{aiText}</p>
        )}

        {error && <p className="app-error">{error}</p>}
      </div>

      <div className="feature-panel">

        <div className="feat-category">
          <span className="feat-category-label">Level</span>
          <div className="feature-row">
            {['auto', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
              <button
                key={lvl}
                className={`feat-pill${levelMode === lvl ? ' feat-pill--active' : ''}`}
                onClick={() => handleLevelChange(lvl)}
              >
                {lvl === 'auto' ? 'Auto' : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="feat-category">
          <span className="feat-category-label">Speed</span>
          <div className="feature-row">
            {[
              { id: 'slow',   label: 'Slow'   },
              { id: 'normal', label: 'Normal' },
              { id: 'fast',   label: 'Fast'   },
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`feat-pill${speed === id ? ' feat-pill--active' : ''}`}
                onClick={() => handleSpeedChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="feat-category">
          <span className="feat-category-label">Corrections</span>
          <div className="feature-row">
            <button
              className={`feat-pill${corrMode === 'gentle' ? ' feat-pill--active' : ''}`}
              onClick={() => handleCorrModeChange('gentle')}
            >
              🌸 Gentle
            </button>
            <button
              className={`feat-pill${corrMode === 'strict' ? ' feat-pill--active' : ''}`}
              onClick={() => handleCorrModeChange('strict')}
            >
              ⚡ Strict
            </button>
          </div>
        </div>

        <div className="feat-category">
          <span className="feat-category-label">Accent</span>
          <div className="feature-row">
            <button className="feat-pill feat-pill--soon" aria-disabled="true" onClick={() => {}}>
              🇫🇷 Paris
              <span className="feat-soon-tip">Coming soon</span>
            </button>
            <button className="feat-pill feat-pill--soon" aria-disabled="true" onClick={() => {}}>
              🇨🇦 Quebec
              <span className="feat-soon-tip">Coming soon</span>
            </button>
            <button className="feat-pill feat-pill--soon" aria-disabled="true" onClick={() => {}}>
              📊 Live stats
              <span className="feat-soon-tip">Coming soon</span>
            </button>
          </div>
        </div>

      </div>

      {isSessionActive && (
        <p className="end-hint">Tap again to end session</p>
      )}

      <div className="app-footer">
        <div className="footer-left">
          {isSessionActive && (
            <span className="session-timer">{formatTime(elapsed)}</span>
          )}
        </div>

        <div className="footer-right">
          {showLowTime && isSessionActive && (
            <span className="low-time">Last session this month → <button onClick={() => setShowUpgrade(true)}>Upgrade</button></span>
          )}
          {showMemoryDot && !showLowTime && (
            <span className="memory-dot-wrapper">
              <span className="memory-dot" />
              <span className="memory-label">Your coach remembers you</span>
            </span>
          )}
          {userData?.plan !== 'free' && userData?.plan && (
            <button className="portal-link" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? 'Loading…' : 'Manage subscription'}
            </button>
          )}
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          sessionCount={userData?.sessions_this_month}
        />
      )}

      {showRecap && recapData && (
        <RecapModal
          recap={recapData}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" className="spinner-path" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <div className="wave-bars">
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
    </div>
  );
}
