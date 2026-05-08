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

const SCENARIOS = [
  { id: 'free',        emoji: '💬', label: 'Free chat' },
  { id: 'cafe',        emoji: '☕', label: 'At the café' },
  { id: 'restaurant',  emoji: '🍽️', label: 'Restaurant' },
  { id: 'grocery',     emoji: '🛒', label: 'Grocery store' },
  { id: 'market',      emoji: '🥦', label: 'Farmers market' },
  { id: 'pharmacy',    emoji: '💊', label: 'Pharmacy' },
  { id: 'haircut',     emoji: '✂️', label: 'Hair salon' },
  { id: 'hotel',       emoji: '🏨', label: 'Hotel check-in' },
  { id: 'airport',     emoji: '✈️', label: 'Airport' },
  { id: 'taxi',        emoji: '🚕', label: 'Taxi / Uber' },
  { id: 'bank',        emoji: '🏦', label: 'At the bank' },
  { id: 'work',        emoji: '💼', label: 'Work meeting' },
  { id: 'interview',   emoji: '👔', label: 'Job interview' },
  { id: 'presentation',emoji: '📊', label: 'Presentation' },
  { id: 'negotiation', emoji: '🤝', label: 'Negotiation' },
  { id: 'email',       emoji: '📧', label: 'Professional email' },
  { id: 'neighbor',    emoji: '🏠', label: 'Meet a neighbor' },
  { id: 'party',       emoji: '🎉', label: 'At a party' },
  { id: 'date',        emoji: '💝', label: 'First date' },
  { id: 'family',      emoji: '👨‍👩‍👧', label: 'Family chat' },
  { id: 'weather',     emoji: '🌨️', label: 'Weather chat' },
  { id: 'sport',       emoji: '⚽', label: 'Talking sports' },
  { id: 'hockey',      emoji: '🏒', label: 'Hockey game' },
  { id: 'sugar_shack', emoji: '🍁', label: 'Cabane à sucre' },
  { id: 'moving',      emoji: '📦', label: 'Moving to Quebec' },
  { id: 'school',      emoji: '🎒', label: 'School meeting' },
  { id: 'museum',      emoji: '🎨', label: 'At a museum' },
  { id: 'doctor',      emoji: '🏥', label: 'Doctor visit' },
  { id: 'emergency',   emoji: '🚨', label: 'Emergency' },
  { id: 'phone',       emoji: '📞', label: 'Phone call' },
];

const SCENARIO_CATEGORIES = [
  { label: '📍 Daily life',    ids: ['cafe', 'restaurant', 'grocery', 'pharmacy', 'haircut', 'hotel', 'airport', 'taxi', 'bank'] },
  { label: '💼 Professional',  ids: ['work', 'interview', 'presentation', 'email', 'negotiation', 'phone'] },
  { label: '🍁 Canadian life', ids: ['neighbor', 'hockey', 'sugar_shack', 'moving', 'school', 'market', 'weather'] },
  { label: '🎉 Social',        ids: ['party', 'date', 'sport', 'family'] },
  { label: '🏥 Essential',     ids: ['doctor', 'emergency', 'museum'] },
];

const DAILY_PICKS = [
  'cafe', 'restaurant', 'work', 'neighbor',
  'grocery', 'hockey', 'market', 'party',
  'hotel', 'pharmacy', 'weather', 'family',
];
const DAY_OF_YEAR = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
const DAILY_PICK_ID = DAILY_PICKS[DAY_OF_YEAR % DAILY_PICKS.length];

function getConfidenceLevel(sessions) {
  if (!sessions || sessions <= 3)  return { label: 'Just starting',       icon: '🌱' };
  if (sessions <= 10)              return { label: 'Building confidence',  icon: '📈' };
  if (sessions <= 20)              return { label: 'Growing fluency',      icon: '💪' };
  return                                  { label: 'Consistent practice',  icon: '⭐' };
}

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; } catch { return fallback; }
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streak, setStreak] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const silenceTimerRef = useRef(null);
  const [scenario, setScenario] = useState('free');
  const [showScenarioHint, setShowScenarioHint] = useState(false);
  const [showScenarioSheet, setShowScenarioSheet] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const scenarioRef = useRef('free');
  const customScenarioRef = useRef('');
  const scenarioHintTimerRef = useRef(null);
  const [error, setError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastTranscript, setLastTranscript] = useState('');
  const [aiText, setAiText] = useState('');

  const [speed, setSpeed]         = useState(() => readLS('getfrench_speed', 'normal'));
  const [corrMode, setCorrMode]   = useState(() => readLS('getfrench_corrmode', 'gentle'));
  const [levelMode, setLevelMode] = useState(() => readLS('getfrench_level', 'auto'));
  const [crosstalk, setCrosstalk] = useState(() => readLS('getfrench_crosstalk', 'false') === 'true');
  const [helpMode, setHelpMode]   = useState(() => readLS('getfrench_helpmode', 'false') === 'true');

  const corrModeRef   = useRef(readLS('getfrench_corrmode', 'gentle'));
  const levelModeRef  = useRef(readLS('getfrench_level', 'auto'));
  const crosstalkRef  = useRef(readLS('getfrench_crosstalk', 'false') === 'true');
  const helpModeRef   = useRef(readLS('getfrench_helpmode', 'false') === 'true');

  const sessionStartRef = useRef(null);
  const timerRef = useRef(null);
  const isActiveRef = useRef(false);
  const messagesRef = useRef([]);
  const listeningRef = useRef(false);
  const transcriptBufferRef = useRef('');
  const sttDebounceRef = useRef(null);

  const { enqueueSentence, finalize, cancel: cancelSpeech, createAudioSession, closeAudioSession } = useSpeechSynthesis();

  useEffect(() => {
    const speedMap = { slow: 0.72, normal: 1.0, fast: 1.35 };
    window.__gfSpeed = speedMap[readLS('getfrench_speed', 'normal')] || 1.0;
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (window.__gfSpeed !== 1.0) this.playbackRate.value = window.__gfSpeed;
      return orig.apply(this, args);
    };
    return () => { AudioBufferSourceNode.prototype.start = orig; delete window.__gfSpeed; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth', { replace: true }); return; }
    api.getMe().then(user => {
      setUserData(user);
      setStreak(user.streak_count || 0);
      if (user.memory && Object.keys(user.memory).length > 0) setShowMemoryDot(true);
    }).catch(err => {
      if (err.status === 401) { clearAuth(); navigate('/auth', { replace: true }); }
      else { setError('Could not load your account. Check your connection and reload.'); }
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
    clearTimeout(silenceTimerRef.current);
    cancelSpeech();
    closeAudioSession();

    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const currentMessages = messagesRef.current;
    const savedSessionId = sessionId;
    const savedUserData = userData;

    // Reset to home state immediately — don't wait for async recap generation
    setBtnState(STATE.IDLE);
    setSessionId(null);
    setElapsed(0);
    setMessages([]);
    messagesRef.current = [];
    sessionStartRef.current = null;
    setShowSuggestions(false);
    setSuggestions([]);
    transcriptBufferRef.current = '';

    if (!savedSessionId || currentMessages.length === 0) return;

    const sessionMinutes = Math.floor(duration / 60);
    const durationLabel = sessionMinutes < 5 ? 'Quick practice' : sessionMinutes <= 10 ? 'Good session' : 'Deep practice';

    try {
      const summary = await api.summarize({ messages: currentMessages, existing_memory: savedUserData?.memory });
      summary.total_minutes = (savedUserData?.memory?.total_minutes || 0) + sessionMinutes;
      summary.session_duration_label = durationLabel;
      const endResult = await api.endSession({ session_id: savedSessionId, duration_seconds: duration, summary });
      const newStreak = endResult?.streak_count || streak;
      setStreak(newStreak);
      summary.streak_count = newStreak;
      setUserData(prev => ({ ...prev, memory: summary }));
      setShowMemoryDot(true);
      setRecapData(summary);
      setShowRecap(true);
    } catch (err) {
      console.error('Failed to save session:', err);
      // Save session without summary, and show a minimal recap
      const endResult = await api.endSession({ session_id: savedSessionId, duration_seconds: duration }).catch(() => null);
      const newStreak = endResult?.streak_count || streak;
      setStreak(newStreak);
      setRecapData({
        session_duration_label: durationLabel,
        streak_count: newStreak,
        encouragement: 'Session terminée ! Continue comme ça. 💪',
      });
      setShowRecap(true);
    }
  }, [sessionId, userData, streak, cancelSpeech, closeAudioSession]);

  const handleAIResponse = useCallback(async (userTranscript) => {
    if (!isActiveRef.current) return;
    listeningRef.current = false;
    clearTimeout(sttDebounceRef.current);
    sttDebounceRef.current = null;
    setBtnState(STATE.THINKING);

    const newMessages = [...messagesRef.current, { role: 'user', content: userTranscript }];
    messagesRef.current = newMessages;
    setMessages([...newMessages]);

    let fullResponse = '';
    let sentenceBuffer = '';
    let speakingStarted = false;
    setAiText('');

    const flushSentences = (isFinal = false) => {
      const sentenceRe = /[^.!?]*[.!?]+/g;
      let match, lastIndex = 0;
      while ((match = sentenceRe.exec(sentenceBuffer)) !== null) {
        const sentence = match[0].trim();
        if (sentence) {
          if (!speakingStarted) { speakingStarted = true; setBtnState(STATE.SPEAKING); setIsThinking(false); setLastTranscript(''); }
          enqueueSentence(sentence);
        }
        lastIndex = sentenceRe.lastIndex;
      }
      sentenceBuffer = sentenceBuffer.slice(lastIndex);
      if (isFinal && sentenceBuffer.trim()) {
        if (!speakingStarted) { speakingStarted = true; setBtnState(STATE.SPEAKING); setIsThinking(false); setLastTranscript(''); }
        enqueueSentence(sentenceBuffer.trim());
        sentenceBuffer = '';
      }
    };

    try {
      await streamMessage(
        newMessages, sessionId,
        corrModeRef.current, levelModeRef.current,
        crosstalkRef.current, helpModeRef.current,
        scenarioRef.current, customScenarioRef.current,
        (chunk) => { fullResponse += chunk; sentenceBuffer += chunk; setAiText(fullResponse); flushSentences(); }
      );

      if (!isActiveRef.current) return;
      flushSentences(true);

      const finalMessages = [...newMessages, { role: 'assistant', content: fullResponse }];
      messagesRef.current = finalMessages;
      setMessages([...finalMessages]);

      if (!speakingStarted) setBtnState(STATE.SPEAKING);

      finalize(() => {
        if (!isActiveRef.current) return;
        const remaining = getRemainingSeconds();
        if (remaining !== null && remaining <= 300 && !showLowTime) setShowLowTime(true);
        setBtnState(STATE.LISTENING);
        listeningRef.current = true;
        if (isActiveRef.current) startListening();

        const level = levelModeRef.current;
        const skipSuggestions = level === 'B2' || level === 'C1' || level === 'C2';
        if (!skipSuggestions) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(async () => {
            if (!isActiveRef.current || !listeningRef.current) return;
            const msgs = messagesRef.current;
            const lastAiMsg = [...msgs].reverse().find(m => m.role === 'assistant')?.content;
            if (!lastAiMsg) return;
            try {
              const result = await api.getSuggestions({
                cefrLevel: level === 'auto' ? 'B1' : level,
                scenario: scenarioRef.current,
                lastAiMessage: lastAiMsg,
              });
              if (!isActiveRef.current) return;
              if (Array.isArray(result?.suggestions) && result.suggestions.length > 0) {
                setSuggestions(result.suggestions);
                setShowSuggestions(true);
              }
            } catch { /* fail silently */ }
          }, 5000);
        }
      });
    } catch (err) {
      console.error('AI error:', err);
      setIsThinking(false);
      if (isActiveRef.current) setBtnState(STATE.IDLE);
    }
  }, [sessionId, enqueueSentence, finalize, getRemainingSeconds, showLowTime]);

  const { start: startListening, stop: stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      if (!isActiveRef.current || !listeningRef.current) return;
      clearTimeout(silenceTimerRef.current);
      setShowSuggestions(false);
      setLastTranscript(transcript);
      transcriptBufferRef.current += (transcriptBufferRef.current ? ' ' : '') + transcript;
      clearTimeout(sttDebounceRef.current);
      sttDebounceRef.current = setTimeout(() => {
        sttDebounceRef.current = null;
        const full = transcriptBufferRef.current.trim();
        transcriptBufferRef.current = '';
        if (!full || !isActiveRef.current) return;
        setAiText('');
        setIsThinking(true);
        handleAIResponse(full);
      }, 1200);
    },
    onEnd: () => { if (isActiveRef.current && listeningRef.current) startListening(); },
    onError: (err) => {
      console.error('STT error:', err);
      if (!isActiveRef.current || !listeningRef.current) return;
      if (err === 'no-speech' || err === 'network' || err === 'audio-capture') startListening();
      else setError(`Microphone error: ${err}`);
    },
  });

  const startSession = useCallback(async () => {
    if (!userData) return;
    if (userData.plan === 'free' && userData.sessions_this_month >= 3) { setShowUpgrade(true); return; }
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
          const remaining = userData.plan === 'free'
            ? 1200 - next
            : (PLAN_LIMITS[userData.plan]?.seconds > 0
              ? PLAN_LIMITS[userData.plan].seconds - (userData.seconds_used || 0) - next
              : Infinity);
          if (remaining <= 0) { endSession(); setShowUpgrade(true); }
          return next;
        });
      }, 1000);
      setBtnState(STATE.LISTENING);
      messagesRef.current = [];
      if (scenarioRef.current !== 'free') {
        setShowScenarioHint(true);
        clearTimeout(scenarioHintTimerRef.current);
        scenarioHintTimerRef.current = setTimeout(() => setShowScenarioHint(false), 3000);
      }
      await handleAIResponse('Hello');
    } catch (err) {
      if (err.code === 'limit_reached') setShowUpgrade(true);
      else setError('Failed to start session. Please try again.');
    }
  }, [userData, endSession, handleAIResponse, createAudioSession]);

  const handleButtonClick = useCallback(() => {
    if (!userData && !isActiveRef.current) {
      setError('Still loading… please wait a moment and try again.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!isActiveRef.current) startSession();
    else endSession();
  }, [startSession, endSession, userData]);

  const handleSpeedChange = (v) => {
    setSpeed(v); localStorage.setItem('getfrench_speed', v);
    const map = { slow: 0.72, normal: 1.0, fast: 1.35 };
    window.__gfSpeed = map[v];
  };
  const handleCorrModeChange = (v) => {
    setCorrMode(v); corrModeRef.current = v; localStorage.setItem('getfrench_corrmode', v);
  };
  const handleLevelChange = (v) => {
    setLevelMode(v); levelModeRef.current = v; localStorage.setItem('getfrench_level', v);
  };
  const handleCrosstalkChange = (v) => {
    setCrosstalk(v); crosstalkRef.current = v; localStorage.setItem('getfrench_crosstalk', String(v));
  };
  const handleHelpModeChange = (v) => {
    setHelpMode(v); helpModeRef.current = v; localStorage.setItem('getfrench_helpmode', String(v));
  };

  const handleSuggestionTap = useCallback((suggestion) => {
    clearTimeout(silenceTimerRef.current);
    setShowSuggestions(false);
    setSuggestions([]);
    setAiText('');
    setIsThinking(true);
    handleAIResponse(suggestion);
  }, [handleAIResponse]);

  const handleScenarioChange = (id) => {
    setScenario(id);
    scenarioRef.current = id;
  };

  const handleScenarioSelect = (id) => {
    handleScenarioChange(id);
    setShowScenarioSheet(false);
  };

  const handleCustomStart = () => {
    const text = customDraft.trim();
    if (!text) return;
    setCustomScenario(text);
    customScenarioRef.current = text;
    setScenario('custom');
    scenarioRef.current = 'custom';
    setShowCustomModal(false);
  };

  const handleSignOut  = () => { clearAuth(); navigate('/'); };
  const handlePortal   = async () => {
    setPortalLoading(true);
    try { const { url } = await api.stripePortal(); window.location.href = url; }
    catch { setError('Could not open billing portal. Please try again.'); }
    finally { setPortalLoading(false); }
  };

  const remaining     = getRemainingSeconds();
  const isSessionActive = !!sessionId;
  const sessionCount  = userData?.memory?.session_count || 0;
  const sessionLabel  = userData ? (sessionCount === 0 ? 'First session' : `Session ${sessionCount + 1}`) : '';
  const confidence    = getConfidenceLevel(sessionCount);

  const currentScenarioDisplay = (() => {
    if (scenario === 'custom') return { emoji: '✏️', label: customScenario || 'Custom mode' };
    const s = SCENARIOS.find(x => x.id === scenario);
    return s ? { emoji: s.emoji, label: s.label } : { emoji: '💬', label: 'Free conversation' };
  })();

  return (
    <div className="app-page">

      {/* ─── Header ─── */}
      <div className="app-header">
        <div className="header-left">
          <Logo size={28} />
          {sessionLabel && <span className="session-count">{sessionLabel}</span>}
        </div>
        <div className="header-right">
          {streak > 0 && (
            <div className="streak-badge">🔥 {streak}</div>
          )}
          <div className="settings-btn-wrap">
            <button
              className="settings-btn"
              onClick={() => !isSessionActive && setShowSettings(true)}
              aria-label="Settings"
              aria-disabled={isSessionActive}
              style={{ opacity: isSessionActive ? 0.35 : 1, cursor: isSessionActive ? 'not-allowed' : 'pointer' }}
            >
              <GearIcon />
            </button>
            {isSessionActive && <span className="settings-disabled-tip">End session to change settings</span>}
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* ─── Confidence badge — centered below header, home state only ─── */}
      {!isSessionActive && (
        <div className="confidence-row">
          <span className="confidence-badge">{confidence.icon} {confidence.label}</span>
        </div>
      )}

      {/* ─── Center ─── */}
      <div className="app-center">

        <div className="app-spacer" />

        {/* Home state — scenario trigger pill */}
        {!isSessionActive && (
          <button className="scenario-trigger" onClick={() => setShowScenarioSheet(true)}>
            {currentScenarioDisplay.emoji} {currentScenarioDisplay.label}
          </button>
        )}

        {/* Session state — scenario hint badge */}
        {isSessionActive && showScenarioHint && (() => {
          if (scenario === 'custom') return <div className="scenario-hint">✏️ Custom mode</div>;
          const s = SCENARIOS.find(x => x.id === scenario);
          return s ? <div className="scenario-hint">{s.emoji} {s.label} mode</div> : null;
        })()}

        {/* Thinking dots — above mic */}
        {isThinking && (
          <div className="thinking-dots" aria-label="Thinking">
            <span /><span /><span />
          </div>
        )}

        {/* Suggestion chips — shown after 5s silence for beginners */}
        {showSuggestions && suggestions.length > 0 && isSessionActive && (
          <div className="suggestions-container">
            <p className="suggestions-label">💡 Vous pouvez dire...</p>
            <div className="suggestions-row">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => handleSuggestionTap(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Mic button ─── */}
        <button
          className={`mic-btn mic-btn--${btnState}`}
          onClick={handleButtonClick}
          aria-label={isSessionActive ? 'End session' : 'Start session'}
        >
          <div className="mic-rings">
            <div className="ring ring-1" /><div className="ring ring-2" /><div className="ring ring-3" />
          </div>
          <div className="mic-inner">
            {!userData && !isSessionActive ? <Spinner /> : (
              <>
                {btnState === STATE.IDLE      && <MicIcon />}
                {btnState === STATE.LISTENING && <MicIcon />}
                {btnState === STATE.THINKING  && <Spinner />}
                {btnState === STATE.SPEAKING  && <WaveIcon />}
              </>
            )}
          </div>
        </button>

        {/* Home state — below mic */}
        {!isSessionActive && (
          <>
            <p className="idle-tagline">{userData ? 'Tap to speak in French' : 'Loading…'}</p>
            <button className="scenario-change-link" onClick={() => setShowScenarioSheet(true)}>
              📍 Change scenario
            </button>
          </>
        )}

        {/* Session state — status label */}
        {btnState !== STATE.IDLE && (
          <p className="state-label">
            {btnState === STATE.LISTENING && 'Listening...'}
            {btnState === STATE.SPEAKING  && ''}
          </p>
        )}

        {isSessionActive && remaining !== null && (
          <p className={`time-remaining${remaining < 120 ? ' time-remaining--danger' : remaining < 300 ? ' time-remaining--warning' : ''}`}>
            {formatTime(remaining)} remaining
          </p>
        )}

        {lastTranscript && <p className="transcript-bubble">&ldquo;{lastTranscript}&rdquo;</p>}
        {aiText         && <p className="ai-text-stream">{aiText}</p>}
        {error          && <p className="app-error">{error}</p>}

        <div className="app-spacer" />
      </div>

      {isSessionActive && <p className="end-hint">Tap again to end session</p>}

      {/* ─── Footer ─── */}
      <div className="app-footer">
        <div className="footer-left">
          {isSessionActive && <span className="session-timer">{formatTime(elapsed)}</span>}
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

      {/* ─── Scenario sheet ─── */}
      {showScenarioSheet && (
        <>
          <div className="scenario-overlay" onClick={() => setShowScenarioSheet(false)} />
          <div className="scenario-sheet" role="dialog" aria-label="Choose your scenario">
            <div className="scenario-sheet-header">
              <span className="scenario-sheet-title">Choose your scenario</span>
              <button className="scenario-sheet-close" onClick={() => setShowScenarioSheet(false)} aria-label="Close">✕</button>
            </div>

            {/* Daily pick */}
            {(() => {
              const dp = SCENARIOS.find(s => s.id === DAILY_PICK_ID);
              if (!dp) return null;
              const isActive = scenario === DAILY_PICK_ID;
              return (
                <div
                  className={`scenario-daily${isActive ? ' scenario-daily--active' : ''}`}
                  onClick={() => handleScenarioSelect(DAILY_PICK_ID)}
                  role="button"
                  aria-pressed={isActive}
                >
                  <span className="scenario-daily-tag">⭐ Today&rsquo;s pick</span>
                  <span className="scenario-daily-emoji">{dp.emoji}</span>
                  <span className="scenario-daily-label">{dp.label}</span>
                </div>
              );
            })()}

            {/* Free chat */}
            <button
              className={`scenario-free-pill${scenario === 'free' ? ' active' : ''}`}
              onClick={() => handleScenarioSelect('free')}
              aria-pressed={scenario === 'free'}
            >
              💬 Free conversation — talk about anything
            </button>

            {/* Categorized rows */}
            {SCENARIO_CATEGORIES.map(cat => (
              <div key={cat.label} className="scenario-category">
                <p className="scenario-category-label">{cat.label}</p>
                <div className="scenario-row">
                  {cat.ids.map(id => {
                    const s = SCENARIOS.find(x => x.id === id);
                    if (!s) return null;
                    return (
                      <button
                        key={id}
                        className={`scenario-pill${scenario === id ? ' active' : ''}`}
                        onClick={() => handleScenarioSelect(id)}
                        aria-pressed={scenario === id}
                      >
                        {s.emoji} {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom */}
            <button
              className={`scenario-pill scenario-pill--custom${scenario === 'custom' ? ' active' : ''}`}
              onClick={() => { setCustomDraft(customScenario); setShowCustomModal(true); setShowScenarioSheet(false); }}
            >
              ✏️ Custom
            </button>
          </div>
        </>
      )}

      {/* ─── Settings panel ─── */}
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        speed={speed}             onSpeedChange={handleSpeedChange}
        corrMode={corrMode}       onCorrModeChange={handleCorrModeChange}
        levelMode={levelMode}     onLevelChange={handleLevelChange}
        crosstalk={crosstalk}     onCrosstalkChange={handleCrosstalkChange}
        helpMode={helpMode}       onHelpModeChange={handleHelpModeChange}
      />

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} sessionCount={userData?.sessions_this_month} />}
      {showRecap && recapData && <RecapModal recap={recapData} onClose={() => setShowRecap(false)} />}

      {/* ─── Custom scenario modal ─── */}
      {showCustomModal && (
        <div className="custom-overlay" onClick={() => setShowCustomModal(false)}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <h3 className="custom-modal-title">Create your scenario</h3>
            <p className="custom-modal-sub">Describe the situation you want to practice in French</p>
            <textarea
              className="custom-textarea"
              rows={4}
              maxLength={300}
              placeholder={"Ex: I'm at a job interview at a Montreal tech company. I need to explain my experience in French..."}
              value={customDraft}
              onChange={e => setCustomDraft(e.target.value)}
              autoFocus
            />
            <p className="custom-char-count">{customDraft.length}/300</p>
            <button
              className="custom-btn-primary"
              disabled={!customDraft.trim()}
              onClick={handleCustomStart}
            >
              Start practicing →
            </button>
            <button
              className="custom-btn-ghost"
              onClick={() => { setShowCustomModal(false); if (!customScenario) { setScenario('free'); scenarioRef.current = 'free'; } }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings panel ─────────────────────────────────────────────────────────

function SettingsPanel({ open, onClose, speed, onSpeedChange, corrMode, onCorrModeChange, levelMode, onLevelChange, crosstalk, onCrosstalkChange, helpMode, onHelpModeChange }) {
  const LEVELS = [
    { id: 'auto', label: '✨ Auto',  desc: 'Detected from your speech' },
    { id: 'A1',   label: 'A1',       desc: 'Complete beginner' },
    { id: 'A2',   label: 'A2',       desc: 'Elementary' },
    { id: 'B1',   label: 'B1',       desc: 'Intermediate' },
    { id: 'B2',   label: 'B2',       desc: 'Upper intermediate' },
    { id: 'C1',   label: 'C1',       desc: 'Advanced' },
  ];
  const SPEEDS = [
    { id: 'slow',   label: '🐢 Slow'   },
    { id: 'normal', label: '▶️ Normal' },
    { id: 'fast',   label: '⚡ Fast'   },
  ];

  return (
    <>
      <div className={`sp-overlay${open ? ' sp-overlay--on' : ''}`} onClick={onClose} />
      <div className={`sp-drawer${open ? ' sp-drawer--open' : ''}`} role="dialog" aria-label="Settings">

        <div className="sp-header">
          <h2 className="sp-title">Settings</h2>
          <button className="sp-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="sp-body">

          <div className="sp-section">
            <p className="sp-label">Speaking mode</p>
            <div className="sp-toggle-row">
              <div>
                <p className="sp-option-title">Crosstalk</p>
                <p className="sp-option-desc">
                  {crosstalk
                    ? 'Your coach will always reply in French'
                    : 'I speak French (default)'}
                </p>
              </div>
              <label className="sp-toggle">
                <input type="checkbox" checked={crosstalk} onChange={e => onCrosstalkChange(e.target.checked)} />
                <span className="sp-toggle-track" />
              </label>
            </div>
            {crosstalk && (
              <p className="sp-hint">You speak English — your coach replies in French only.</p>
            )}
          </div>

          <div className="sp-section">
            <p className="sp-label">Correction style</p>
            <div className="sp-options">
              <button
                className={`sp-option${corrMode === 'gentle' ? ' sp-option--on' : ''}`}
                onClick={() => onCorrModeChange('gentle')}
              >
                <span className="sp-option-title">🌸 Gentle</span>
                <span className="sp-option-desc">Corrections woven naturally into replies</span>
              </button>
              <button
                className={`sp-option${corrMode === 'strict' ? ' sp-option--on' : ''}`}
                onClick={() => onCorrModeChange('strict')}
              >
                <span className="sp-option-title">⚡ Strict</span>
                <span className="sp-option-desc">Every mistake corrected explicitly</span>
              </button>
            </div>
          </div>

          <div className="sp-section">
            <p className="sp-label">Coach speaking speed</p>
            <div className="sp-options sp-options--row">
              {SPEEDS.map(s => (
                <button
                  key={s.id}
                  className={`sp-option sp-option--compact${speed === s.id ? ' sp-option--on' : ''}`}
                  onClick={() => onSpeedChange(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-section">
            <p className="sp-label">French level</p>
            <p className="sp-sublabel">Auto-detected by default</p>
            <div className="sp-options">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  className={`sp-option sp-option--level${levelMode === l.id ? ' sp-option--on' : ''}`}
                  onClick={() => onLevelChange(l.id)}
                >
                  <span className="sp-option-title">{l.label}</span>
                  <span className="sp-option-desc">{l.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sp-section">
            <p className="sp-label">In-session help</p>
            <div className="sp-toggle-row">
              <div>
                <p className="sp-option-title">English help</p>
                <p className="sp-option-desc">
                  {helpMode
                    ? 'Coach answers your questions in English'
                    : 'Off (default)'}
                </p>
              </div>
              <label className="sp-toggle">
                <input type="checkbox" checked={helpMode} onChange={e => onHelpModeChange(e.target.checked)} />
                <span className="sp-toggle-track" />
              </label>
            </div>
            {helpMode && (
              <p className="sp-hint">Turn off to return to full French practice.</p>
            )}
          </div>

        </div>

        <p className="sp-footer">Settings apply from your next message</p>
      </div>
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
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
      <div className="bar" /><div className="bar" /><div className="bar" />
      <div className="bar" /><div className="bar" />
    </div>
  );
}
