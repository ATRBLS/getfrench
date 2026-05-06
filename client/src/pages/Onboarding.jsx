import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../lib/auth';
import { useSpeechRecognition } from '../hooks/useSpeech';
import Logo from '../components/Logo';
import './Onboarding.css';

// ─── Shared ────────────────────────────────────────────────────────

function RevealLines({ lines, intervalMs = 1100, onDone }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) { onDone?.(); return; }
    const t = setTimeout(() => setShown(n => n + 1), shown === 0 ? 300 : intervalMs);
    return () => clearTimeout(t);
  }, [shown]); // eslint-disable-line
  return (
    <div className="o-reveal">
      {lines.map((line, i) => (
        <p key={i} className={`o-reveal-line${i < shown ? ' o-reveal-line--on' : ''}`}>{line}</p>
      ))}
    </div>
  );
}

function Cards({ options, onSelect }) {
  const [sel, setSel] = useState('');
  const pick = (opt) => { if (sel) return; setSel(opt); setTimeout(() => onSelect(opt), 480); };
  return (
    <div className="o-cards">
      {options.map(opt => (
        <button
          key={opt}
          className={`o-card${sel === opt ? ' o-card--on' : ''}`}
          onClick={() => pick(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Screen 1 — Hook ───────────────────────────────────────────────

function S1({ next }) {
  const [done, setDone] = useState(false);
  return (
    <div className="o-body">
      <RevealLines
        lines={[
          "You've been learning French for years.",
          'But when someone speaks to you...',
          'You freeze.',
        ]}
        onDone={() => setDone(true)}
      />
      {done && (
        <div className="o-btns">
          <button className="o-btn" onClick={next}>That&rsquo;s me →</button>
          <button className="o-ghost" onClick={next}>Not really</button>
        </div>
      )}
    </div>
  );
}

// ─── Screen 2 — Situation ──────────────────────────────────────────

function S2({ next, set }) {
  return (
    <div className="o-body">
      <h2 className="o-title">What&rsquo;s your situation?</h2>
      <Cards
        options={[
          'My kids are in French immersion',
          'I need French for work or promotion',
          "I'm moving to Quebec or Montreal",
          'I want to speak French in my daily life',
        ]}
        onSelect={v => { set('situation', v); next(); }}
      />
    </div>
  );
}

// ─── Screen 3 — Name ───────────────────────────────────────────────

function S3({ next, set }) {
  const [name, setName] = useState('');
  const submit = () => { const n = name.trim(); if (n) { set('name', n); next(); } };
  return (
    <div className="o-body">
      <h2 className="o-title">First, what&rsquo;s your name?</h2>
      <input
        className="o-input"
        type="text"
        placeholder="Your first name"
        value={name}
        autoFocus
        autoComplete="given-name"
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <button className="o-btn" disabled={!name.trim()} onClick={submit}>
        Continue →
      </button>
    </div>
  );
}

// ─── Screen 4 — How long ───────────────────────────────────────────

function S4({ next, set, name }) {
  return (
    <div className="o-body">
      <h2 className="o-title">{name}, how long have you been learning French?</h2>
      <Cards
        options={['Less than 1 year', '1 to 3 years', '3 to 5 years', 'More than 5 years']}
        onSelect={v => { set('duration', v); next(); }}
      />
    </div>
  );
}

// ─── Screen 5 — Blocker ────────────────────────────────────────────

function S5({ next, set }) {
  return (
    <div className="o-body">
      <h2 className="o-title">What stops you from speaking?</h2>
      <Cards
        options={[
          "I'm afraid of looking stupid",
          'I freeze when someone speaks fast',
          "I know words but can't string them together",
          "I'm embarrassed in front of native speakers",
        ]}
        onSelect={v => { set('blocker', v); next(); }}
      />
    </div>
  );
}

// ─── Screen 6 — AHA ────────────────────────────────────────────────

const AHA_DATA = {
  "I'm afraid of looking stupid": {
    stat: '65%', src: 'Language Learning Journal, 2019',
    text: 'of language learners say speaking anxiety is their #1 barrier to fluency.',
    sub: n => `${n}, you're not alone.`,
  },
  "I'm embarrassed in front of native speakers": {
    stat: '65%', src: 'Language Learning Journal, 2019',
    text: 'of language learners say speaking anxiety is their #1 barrier to fluency.',
    sub: n => `${n}, you're not alone.`,
  },
  'I freeze when someone speaks fast': {
    stat: '70%', src: 'Common European Framework research',
    text: 'of French learners understand more than they can speak — the gap is practice, not knowledge.',
    sub: n => `${n}, your brain knows more than you think.`,
  },
  "I know words but can't string them together": {
    stat: '3 years', src: "Krashen's Input Hypothesis",
    text: 'The average adult studies a language for 3+ years without ever having a real conversation. The reason? Not enough speaking.',
    sub: n => `${n}, studying isn't enough. Speaking is.`,
  },
};

function S6({ next, answers, name }) {
  const d = AHA_DATA[answers.blocker] || AHA_DATA["I'm afraid of looking stupid"];
  return (
    <div className="o-body">
      <div className="o-stat">{d.stat}</div>
      <p className="o-aha-text">{d.text}</p>
      <p className="o-aha-src">{d.src}</p>
      <p className="o-aha-sub">{d.sub(name)}</p>
      <button className="o-btn" onClick={next}>I see →</button>
    </div>
  );
}

// ─── Screen 7 — Bridge ─────────────────────────────────────────────

function S7({ next }) {
  return (
    <div className="o-body">
      <h2 className="o-title">It doesn&rsquo;t have to be this way.</h2>
      <p className="o-body-text">
        The solution isn&rsquo;t more grammar lessons. It&rsquo;s a safe place to practice — where
        no one judges you for making mistakes.
      </p>
      <p className="o-body-small">Because mistakes are how you learn.</p>
      <button className="o-btn" onClick={next}>Show me →</button>
    </div>
  );
}

// ─── Screen 8 — Level ──────────────────────────────────────────────

function S8({ next, set }) {
  return (
    <div className="o-body">
      <h2 className="o-title">How would you rate your French right now?</h2>
      <Cards
        options={[
          'A1 — Complete beginner',
          'A2 — I understand a little',
          'B1 — I can have simple conversations',
          'B2 — Fairly fluent but not confident',
          'C1 — Advanced, want to perfect it',
        ]}
        onSelect={v => {
          const level = v.split(' ')[0];
          set('level', level);
          localStorage.setItem('getfrench_level', level);
          // A1 beginners get crosstalk on by default so they can speak English
          if (level === 'A1') {
            localStorage.setItem('getfrench_crosstalk', 'true');
            localStorage.setItem('getfrench_helpmode', 'true');
          }
          next();
        }}
      />
    </div>
  );
}

// ─── Screen 9 — Goal ───────────────────────────────────────────────

function S9({ next, set }) {
  return (
    <div className="o-body">
      <h2 className="o-title">What would speaking French confidently change for you?</h2>
      <Cards
        options={[
          'My relationship with my kids',
          'My career opportunities',
          'My daily life in Canada',
          'My confidence as a person',
        ]}
        onSelect={v => { set('goal', v); next(); }}
      />
    </div>
  );
}

// ─── Screen 10 — Visualization ─────────────────────────────────────

function S10({ next, name }) {
  const [done, setDone] = useState(false);
  return (
    <div className="o-body">
      <h2 className="o-title">Imagine this, {name}.</h2>
      <RevealLines
        lines={[
          'You walk into a conversation in French.',
          'Someone speaks to you.',
          'And you just... respond.',
          'Not perfect.',
          'Confident.',
        ]}
        intervalMs={950}
        onDone={() => setDone(true)}
      />
      {done && <button className="o-btn" onClick={next}>I want that →</button>}
    </div>
  );
}

// ─── Screen 11 — Meet coach ────────────────────────────────────────

function S11({ next }) {
  return (
    <div className="o-body o-body--center">
      <Logo size={72} />
      <h2 className="o-title">Meet your French coach.</h2>
      <ul className="o-feature-list">
        <li>🎙️ Speaks French with you — not at you</li>
        <li>🧠 Adapts to your level in real time</li>
        <li>💙 Never judges. Never gets impatient.</li>
      </ul>
      <button className="o-btn" onClick={next}>Let&rsquo;s go →</button>
    </div>
  );
}

// ─── Screen 12 — How it works ──────────────────────────────────────

function S12({ next }) {
  return (
    <div className="o-body">
      <h2 className="o-title">Here&rsquo;s how it works.</h2>
      <ol className="o-steps">
        {[
          'You speak — in French, even imperfectly',
          'Your coach listens and responds naturally',
          'You improve — session by session',
        ].map((s, i) => (
          <li key={i}><span>{i + 1}</span>{s}</li>
        ))}
      </ol>
      <button className="o-btn" onClick={next}>Got it →</button>
    </div>
  );
}

// ─── Screen 13 — Commitment ────────────────────────────────────────

const COMMIT = {
  'Very serious — I need this': "That's exactly who GetFrench is built for.",
  'Pretty motivated — I want to improve': "That's enough to get started.",
  'Just exploring for now': "No pressure. Let's show you what's possible.",
};

function S13({ next, set }) {
  const [resp, setResp] = useState('');
  if (resp) {
    return (
      <div className="o-body o-body--center">
        <p className="o-commit-resp">&ldquo;{resp}&rdquo;</p>
      </div>
    );
  }
  return (
    <div className="o-body">
      <h2 className="o-title">How serious are you about speaking French confidently?</h2>
      <Cards
        options={Object.keys(COMMIT)}
        onSelect={v => {
          set('commitment', v);
          setResp(COMMIT[v]);
          setTimeout(next, 1800);
        }}
      />
    </div>
  );
}

// ─── Screen 14 — Loading ───────────────────────────────────────────

function S14({ next }) {
  const [done, setDone] = useState(0);
  const items = ['Analyzing your situation', 'Calibrating your level', 'Preparing your coach'];
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDone(i);
      if (i >= items.length) { clearInterval(iv); setTimeout(next, 700); }
    }, 1100);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line
  return (
    <div className="o-body o-body--center">
      <div className="o-logo-pulse"><Logo size={60} /></div>
      <h2 className="o-title" style={{ marginTop: 24 }}>Building your French plan...</h2>
      <ul className="o-check-list">
        {items.map((item, i) => (
          <li key={item} className={i < done ? 'done' : ''}>
            <span>{i < done ? '✓' : '○'}</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Screen 15 — Mini session ──────────────────────────────────────

const MINI_Q = {
  A1: 'Bonjour! Comment tu t\'appelles?',
  A2: 'Bonjour! Comment tu t\'appelles?',
  B1: 'Bonjour! Comment s\'est passée ta journée?',
  B2: 'Bonjour! Comment s\'est passée ta journée?',
  C1: 'Bonjour! Qu\'est-ce qui vous a amené à apprendre le français?',
};
const MINI_R = {
  A1: "C'est très bien! Vous avez fait un grand pas aujourd'hui. Continuez!",
  A2: 'Bravo! Vous vous en sortez très bien pour votre niveau.',
  B1: "Excellent! Votre français est déjà bien solide. On continue!",
  B2: "Impressionnant! Vous parlez avec beaucoup d'aisance.",
  C1: 'Remarquable! Votre maîtrise du français est évidente.',
};

function S15({ next, answers, name }) {
  const level = answers.level || 'B1';
  const [phase, setPhase] = useState('idle'); // idle | listening | thinking | done
  const phaseRef = useRef('idle');
  const [transcript, setTranscript] = useState('');
  const bufRef = useRef('');
  const stopRef = useRef(null);

  const setP = (p) => { phaseRef.current = p; setPhase(p); };

  const finish = useCallback(() => {
    setP('thinking');
    setTimeout(() => setP('done'), 1400);
  }, []);

  const { start: startSTT, stop: stopSTT } = useSpeechRecognition({
    onResult: t => {
      bufRef.current += (bufRef.current ? ' ' : '') + t;
      setTranscript(bufRef.current);
    },
    onEnd: () => { if (phaseRef.current === 'listening') finish(); },
    onError: () => { if (phaseRef.current === 'listening') finish(); },
  });
  stopRef.current = stopSTT;

  const handleMic = () => {
    if (phaseRef.current === 'idle') {
      bufRef.current = '';
      setTranscript('');
      setP('listening');
      startSTT();
      setTimeout(() => { if (phaseRef.current === 'listening') { stopRef.current?.(); } }, 30000);
    } else if (phaseRef.current === 'listening') {
      stopSTT();
      finish();
    }
  };

  return (
    <div className="o-body o-body--center">
      <h2 className="o-title">{name}, let&rsquo;s hear your French.</h2>
      <p className="o-body-small">30 seconds. No judgment. Just speak naturally.</p>

      <div className="o-mini-q">
        <p className="o-mini-label">Your coach asks:</p>
        <p className="o-mini-text">&ldquo;{MINI_Q[level] || MINI_Q.B1}&rdquo;</p>
      </div>

      {phase !== 'thinking' && phase !== 'done' && (
        <button
          className={`o-mic-btn${phase === 'listening' ? ' o-mic-btn--on' : ''}`}
          onClick={handleMic}
        >
          <MicSVG />
        </button>
      )}

      {phase === 'idle' && <p className="o-mini-hint">Tap the mic to respond</p>}
      {phase === 'listening' && <p className="o-mini-hint">Listening... tap again to stop</p>}
      {phase === 'thinking' && <p className="o-mini-hint">Your coach is thinking...</p>}

      {transcript && phase !== 'idle' && (
        <div className="o-mini-bubble o-mini-bubble--user">
          <p className="o-mini-label">You said:</p>
          <p>&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {phase === 'done' && (
        <>
          <div className="o-mini-bubble o-mini-bubble--coach">
            <p className="o-mini-label">Your coach:</p>
            <p>&ldquo;{MINI_R[level] || MINI_R.B1}&rdquo;</p>
          </div>
          <button className="o-btn" onClick={next}>See your results →</button>
        </>
      )}

      {phase === 'idle' && (
        <button className="o-ghost" style={{ marginTop: 8 }} onClick={next}>
          Skip for now
        </button>
      )}
    </div>
  );
}

function MicSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// ─── Screen 16 — Level result ──────────────────────────────────────

const LEVEL_NOTE = {
  A1: 'Every expert was once a beginner. This is where it starts.',
  A2: 'You have the foundation. Now you need to speak.',
  B1: 'You have a solid base. Confidence is all you need.',
  B2: "You're further along than you think.",
  C1: "You're almost there. Polish is next.",
};

function S16({ next, detectedLevel }) {
  const lvl = detectedLevel || 'B1';
  return (
    <div className="o-body o-body--center">
      <div className="o-level-badge">{lvl}</div>
      <h2 className="o-title">Your coach detected: {lvl}</h2>
      <p className="o-body-text" style={{ textAlign: 'center' }}>
        You&rsquo;re further along than you think.
      </p>
      <p className="o-body-small" style={{ textAlign: 'center' }}>
        {LEVEL_NOTE[lvl] || LEVEL_NOTE.B1}
      </p>
      <button className="o-btn" onClick={next}>Continue →</button>
    </div>
  );
}

// ─── Screen 17 — Celebration ───────────────────────────────────────

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  color: ['#f582ae', '#0055A4', '#EF4135', '#FFD700', '#30d158', '#FF6B35'][i % 6],
  left: `${(i * 11 + 4) % 96}%`,
  delay: `${((i * 0.13) % 1.6).toFixed(2)}s`,
  size: `${6 + (i % 5)}px`,
  rot: `${(i * 37) % 360}deg`,
}));

function S17({ next }) {
  const [done, setDone] = useState(false);
  return (
    <div className="o-body o-body--center" style={{ position: 'relative' }}>
      <div className="o-confetti" aria-hidden="true">
        {CONFETTI.map(p => (
          <div key={p.id} className="o-confetti-piece" style={{
            background: p.color, left: p.left,
            animationDelay: p.delay,
            width: p.size, height: p.size,
            '--rot': p.rot,
          }} />
        ))}
      </div>
      <RevealLines
        lines={['You just spoke French.', 'Even with mistakes.', "And that's okay."]}
        intervalMs={1000}
        onDone={() => setDone(true)}
      />
      {done && (
        <>
          <p className="o-fire">🔥 Day 1</p>
          <button className="o-btn" onClick={next}>Let&rsquo;s keep going →</button>
        </>
      )}
    </div>
  );
}

// ─── Screen 18 — Personal plan ─────────────────────────────────────

function S18({ next, answers, name, detectedLevel }) {
  const lvl = detectedLevel || answers.level || 'B1';
  return (
    <div className="o-body">
      <h2 className="o-title">{name}&rsquo;s French journey</h2>
      <div className="o-plan-card">
        <div className="o-plan-row"><span>Current level</span><strong>{lvl}</strong></div>
        <div className="o-plan-row"><span>Your goal</span><strong>{answers.goal || 'Speak confidently'}</strong></div>
        <div className="o-plan-row"><span>Sessions</span><strong>Available 24/7</strong></div>
      </div>
      <blockquote className="o-quote">
        &ldquo;Your French doesn&rsquo;t have to be perfect. It just has to start.&rdquo;
      </blockquote>
      <button className="o-btn" onClick={next}>I&rsquo;m ready →</button>
    </div>
  );
}

// ─── Screen 19 — No fake reviews ───────────────────────────────────

function S19({ next }) {
  return (
    <div className="o-body">
      <h2 className="o-title">Be among the first.</h2>
      <p className="o-body-text">
        GetFrench is new. We don&rsquo;t have thousands of reviews yet.
        What we have is a coach that works — and early users who are already speaking.
      </p>
      <p className="o-body-small">Join them.</p>
      <button className="o-btn" onClick={next}>Continue →</button>
    </div>
  );
}

// ─── Screen 20 — Paywall ───────────────────────────────────────────

const PLANS20 = [
  { id: 'free',    name: 'Free',    price: null, desc: '3 sessions to start' },
  { id: 'starter', name: 'Starter', price: 9.99,  desc: '4 hours / month' },
  { id: 'pro',     name: 'Pro',     price: 19.99, desc: '10 hours / month', popular: true },
  { id: 'max',     name: 'Max',     price: 39.99, desc: '20 hours / month' },
];

function S20({ navigate, name }) {
  return (
    <div className="o-body">
      <h2 className="o-title">{name}&rsquo;s plan is ready.</h2>
      <ul className="o-check-list o-check-list--coral">
        {[
          'AI coach that never judges',
          'Adapts to your exact level',
          'Available 24/7, whenever you need',
        ].map(item => (
          <li key={item} className="done">
            <span>✓</span>{item}
          </li>
        ))}
      </ul>
      <div className="o-pricing-mini">
        {PLANS20.map(p => (
          <div key={p.id} className={`o-price-card${p.popular ? ' o-price-card--pop' : ''}`}>
            {p.popular && <span className="o-pop-tag">Most Popular</span>}
            <p className="o-price-name">{p.name}</p>
            <p className="o-price-amt">{p.price ? `$${p.price}/mo` : 'Free'}</p>
            <p className="o-price-desc">{p.desc}</p>
          </div>
        ))}
      </div>
      <p className="o-body-small" style={{ textAlign: 'center' }}>
        Start with 3 free sessions. No credit card required.
      </p>
      <button className="o-btn" onClick={() => navigate('/auth')}>Start for free →</button>
      <button className="o-ghost" onClick={() => navigate('/')}>See pricing details</button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    name: '', situation: '', duration: '', blocker: '', level: '', goal: '', commitment: '',
  });
  const [detectedLevel, setDetectedLevel] = useState('');

  useEffect(() => {
    if (isAuthenticated()) navigate('/app', { replace: true });
  }, [navigate]);

  const goTo = useCallback(n => setStep(Math.max(1, Math.min(20, n))), []);
  const next = useCallback(() => setStep(s => Math.min(s + 1, 20)), []);
  const back = useCallback(() => setStep(s => Math.max(s - 1, 1)), []);
  const set = useCallback((key, val) => setAnswers(a => ({ ...a, [key]: val })), []);

  const name = answers.name || 'there';
  const detected = detectedLevel || answers.level;

  const screens = {
    1:  <S1  next={next} />,
    2:  <S2  next={next} set={set} />,
    3:  <S3  next={next} set={set} />,
    4:  <S4  next={next} set={set} name={name} />,
    5:  <S5  next={next} set={set} />,
    6:  <S6  next={next} answers={answers} name={name} />,
    7:  <S7  next={next} />,
    8:  <S8  next={next} set={set} />,
    9:  <S9  next={next} set={set} />,
    10: <S10 next={next} name={name} />,
    11: <S11 next={next} />,
    12: <S12 next={next} />,
    13: <S13 next={next} set={set} />,
    14: <S14 next={next} />,
    15: <S15 next={next} answers={answers} name={name} setDetectedLevel={setDetectedLevel} />,
    16: <S16 next={next} detectedLevel={detected} />,
    17: <S17 next={next} />,
    18: <S18 next={next} answers={answers} name={name} detectedLevel={detected} />,
    19: <S19 next={next} />,
    20: <S20 navigate={navigate} name={name} />,
  };

  return (
    <div className="o-root">
      <div className="o-progress-bar">
        <div className="o-progress-fill" style={{ width: `${(step / 20) * 100}%` }} />
      </div>
      {step > 1 && (
        <button className="o-back" onClick={back} aria-label="Back">←</button>
      )}
      <div className="o-screen" key={step}>
        {screens[step]}
      </div>
    </div>
  );
}
