import { useRef, useCallback, useEffect } from 'react';
import { getToken } from '../lib/auth';

let micPermissionRequested = false;

// Must be called during a user gesture (button tap).
// On iOS Safari, getUserMedia() primes the mic permission for SpeechRecognition.
// We hold the stream open for 500ms — releasing immediately can lose the audio
// session before webkitSpeechRecognition attaches to it.
export async function requestMicPermission() {
  if (micPermissionRequested) return;
  micPermissionRequested = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setTimeout(() => stream.getTracks().forEach(t => t.stop()), 500);
  } catch (err) {
    console.warn('[Speech] Mic permission denied:', err.message);
  }
}

// Unlock Web Speech synthesis on iOS Safari during a user gesture.
// speechSynthesis shares the audio session with SpeechRecognition on Safari.
export function unlockAudio() {
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {}
}

export function useSpeechRecognition({ onResult, onEnd, onError }) {
  const recognitionRef = useRef(null);
  const cbRef = useRef({ onResult, onEnd, onError });
  useEffect(() => { cbRef.current = { onResult, onEnd, onError }; });

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      cbRef.current.onError?.('Speech recognition not supported. Try Chrome or Safari.');
      return;
    }

    try { recognitionRef.current?.abort(); } catch {}

    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      cbRef.current.onResult?.(transcript);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') cbRef.current.onError?.(e.error);
    };
    rec.onend = () => cbRef.current.onEnd?.();

    recognitionRef.current = rec;
    try {
      rec.start();
      console.log('[STT] recognition.start() called');
    } catch (err) {
      console.error('[STT] rec.start() threw:', err.message);
      cbRef.current.onError?.(err.message);
    }
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  }, []);

  return { start, stop };
}

export function useSpeechSynthesis() {
  const audioCtxRef    = useRef(null); // persistent AudioContext for the whole session
  const queueRef       = useRef([]);
  const playingRef     = useRef(false);
  const onDoneRef      = useRef(null);
  const finalizedRef   = useRef(false);
  const currentRef     = useRef(null); // current AudioBufferSourceNode
  const genRef         = useRef(0);    // incremented on cancel to invalidate in-flight ops

  // Call during the user gesture that starts the session so iOS grants audio permission.
  const createAudioSession = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Play a silent 1-sample buffer to fully unlock the context on iOS.
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      audioCtxRef.current = ctx;
      console.log('[TTS] AudioContext created, state:', ctx.state);
    } catch (e) {
      console.warn('[TTS] AudioContext creation failed:', e.message);
    }
  }, []);

  const closeAudioSession = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const playNext = useCallback((gen) => {
    if (gen !== genRef.current) return;

    if (queueRef.current.length === 0) {
      if (finalizedRef.current) {
        playingRef.current   = false;
        finalizedRef.current = false;
        const cb = onDoneRef.current;
        onDoneRef.current = null;
        cb?.();
      } else {
        playingRef.current = false;
      }
      return;
    }

    const text  = queueRef.current.shift();
    const token = getToken();
    const base  = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    fetch(`${base}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        return res.arrayBuffer();
      })
      .then(arrayBuffer => {
        if (gen !== genRef.current) return Promise.reject(new Error('cancelled'));
        const ctx = audioCtxRef.current;
        if (!ctx) throw new Error('no AudioContext');
        return ctx.decodeAudioData(arrayBuffer);
      })
      .then(async audioBuffer => {
        if (gen !== genRef.current) return;
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        currentRef.current = source;

        // onended fires inside the AudioContext callback — iOS Safari treats this
        // as a trusted audio event, so SpeechRecognition.start() works immediately.
        source.onended = () => {
          currentRef.current = null;
          playNext(gen);
        };

        // iOS Safari suspends the AudioContext after the async gap between
        // createAudioSession() and the first actual audio playback. Resume it
        // so the first TTS response is audible (not silently dropped).
        if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch {}
        }
        source.start(0);
      })
      .catch((err) => {
        if (gen !== genRef.current || err.message === 'cancelled') return;
        console.error('[TTS] ElevenLabs failed, skipping sentence:', err.message);
        // Skip silently rather than switching to Web Speech (avoids jarring voice/accent change)
        playNext(gen);
      });
  }, []);

  const enqueueSentence = useCallback((text) => {
    if (!text.trim()) return;
    queueRef.current.push(text.trim());
    if (!playingRef.current) {
      playingRef.current = true;
      playNext(genRef.current);
    }
  }, [playNext]);

  const finalize = useCallback((onEnd) => {
    onDoneRef.current    = onEnd;
    finalizedRef.current = true;
    if (!playingRef.current && queueRef.current.length === 0) {
      finalizedRef.current = false;
      onEnd?.();
    }
  }, []);

  const cancel = useCallback(() => {
    genRef.current++;
    queueRef.current     = [];
    playingRef.current   = false;
    finalizedRef.current = false;
    onDoneRef.current    = null;
    if (currentRef.current) {
      try { currentRef.current.stop(); } catch {}
      currentRef.current = null;
    }
  }, []);

  return { enqueueSentence, finalize, cancel, createAudioSession, closeAudioSession };
}
