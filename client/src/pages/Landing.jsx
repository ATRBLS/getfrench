import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '../components/Logo';
import './Landing.css';

const PLANS = [
  { id: 'free',    name: 'Free',    monthly: 0,     yearly: 0,     hours: null, sessions: 3 },
  { id: 'starter', name: 'Starter', monthly: 12.99, yearly: 9.99,  hours: 4 },
  { id: 'pro',     name: 'Pro',     monthly: 23.99, yearly: 19.99, hours: 10, popular: true },
  { id: 'max',     name: 'Max',     monthly: 44.99, yearly: 39.99, hours: 20 },
];

export default function Landing() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(true);

  return (
    <div className="l-page">
      <LNav navigate={navigate} />
      <LHero navigate={navigate} />
      <LPain />
      <LHow />
      <LStats />
      <LStory />
      <LPricing navigate={navigate} yearly={yearly} setYearly={setYearly} />
      <LInstall />
      <LFooter />
    </div>
  );
}

function LNav({ navigate }) {
  return (
    <nav className="l-nav">
      <div className="l-nav-inner">
        <div className="l-nav-brand">
          <Logo size={34} />
          <span className="l-brand-name">GetFrench</span>
        </div>
        <div className="l-nav-actions">
          <button className="l-nav-signin" onClick={() => navigate('/auth')}>Sign in</button>
          <button className="l-nav-cta" onClick={() => navigate('/onboarding')}>Start free →</button>
        </div>
      </div>
    </nav>
  );
}

function LHero({ navigate }) {
  const scrollToPain = () => document.getElementById('pain')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <section className="l-hero">
      <div className="l-aurora" aria-hidden="true">
        <div className="l-orb l-orb--coral" />
        <div className="l-orb l-orb--sky" />
      </div>
      <div className="l-hero-body">
        <span className="l-pill">Made for Canadians 🍁</span>
        <h1 className="l-h1">
          Say it wrong.<br />
          <span className="l-accent">That&rsquo;s how you learn.</span>
        </h1>
        <p className="l-sub">
          The fear of making mistakes in French keeps millions of Canadians silent.
          GetFrench gives you a space to speak, stumble, and improve — with zero judgment.
        </p>
        <div className="l-hero-actions">
          <button className="l-btn-coral" onClick={() => navigate('/onboarding')}>Speak for free →</button>
          <button className="l-btn-ghost" onClick={scrollToPain}>Why it works</button>
        </div>
        <p className="l-fine">3 free sessions · No credit card</p>
      </div>
      <div className="l-mic-preview" aria-hidden="true">
        <div className="l-mic-glow" />
        <div className="l-mic-circle"><MicSVG /></div>
        <div className="l-mic-ring l-mic-ring--1" />
        <div className="l-mic-ring l-mic-ring--2" />
      </div>
    </section>
  );
}

function LPain() {
  const cards = [
    {
      icon: '😰',
      title: 'You know more than you think',
      desc: "Most Canadians have studied French for years. The problem isn't knowledge. It's the fear of being judged.",
    },
    {
      icon: '🎯',
      title: 'Practice without pressure',
      desc: 'GetFrench gives you a patient AI coach available 24/7. No embarrassment. No awkward silences. Just practice.',
    },
    {
      icon: '🔄',
      title: 'Real conversations, real scenarios',
      desc: 'Order at a café, practice a work meeting, chat with a neighbor — in French, at your own pace.',
    },
  ];
  return (
    <section className="l-section" id="pain">
      <div className="l-section-inner">
        <p className="l-eyebrow">Why it works</p>
        <h2>You don&rsquo;t have a French problem.<br />You have a fear problem.</h2>
        <div className="l-how-grid">
          {cards.map(c => (
            <div key={c.title} className="l-card">
              <span className="l-card-icon">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LHow() {
  const steps = [
    {
      n: '1',
      icon: '🎙️',
      title: 'Choose your scenario',
      desc: 'Pick from 7 real-life situations — café, work meeting, grocery store, and more — or just talk freely.',
    },
    {
      n: '2',
      icon: '🗣️',
      title: 'Speak French',
      desc: 'Your AI coach listens, responds naturally, and adapts to your level in real time. Make mistakes. That\'s the point.',
    },
    {
      n: '3',
      icon: '📈',
      title: 'See your progress',
      desc: 'After every session, get a personal feedback report with your best moment, words to remember, and what to focus on next.',
    },
  ];
  return (
    <section className="l-section" id="how">
      <div className="l-section-inner">
        <p className="l-eyebrow">How it works</p>
        <h2>Three steps to speaking French</h2>
        <div className="l-steps-grid">
          {steps.map(s => (
            <div key={s.n} className="l-step-card">
              <div className="l-step-num">{s.n}</div>
              <span className="l-card-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LStory() {
  return (
    <section className="l-section l-story-section">
      <div className="l-section-inner">
        <p className="l-eyebrow">Our story</p>
        <h2>Built by someone who knows exactly how you feel.</h2>
        <p className="l-story-preview">
          I moved to Toronto in April 2025. My English was decent on paper.
          But in real conversations, I froze. Then I watched my kids learn English
          at school in months, without a single grammar rule. Just by speaking,
          fearlessly. That changed everything.
        </p>
        <a href="/story" className="l-story-link">Read the full story →</a>
      </div>
    </section>
  );
}

function LStats() {
  const stats = [
    {
      value: '65%',
      label: 'of French learners say fear, not grammar, holds them back',
      source: 'Language Learning Journal, 2019',
    },
    {
      value: '7',
      label: 'real-life scenarios to practice',
      source: 'from café to work meetings',
    },
    {
      value: '24/7',
      label: 'your coach is available',
      source: 'no scheduling, no waiting',
    },
  ];
  return (
    <section className="l-why">
      <div className="l-why-orbs" aria-hidden="true">
        <div className="l-why-orb l-why-orb--coral" />
        <div className="l-why-orb l-why-orb--sky" />
      </div>
      <div className="l-why-inner">
        <p className="l-eyebrow l-eyebrow--light">Built for Canadians who want to speak</p>
        <div className="l-why-stats l-why-stats--large">
          {stats.map(s => (
            <div key={s.value} className="l-stat l-stat--light">
              <span>{s.value}</span>
              <p>{s.label}</p>
              <small>{s.source}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LPricing({ navigate, yearly, setYearly }) {
  return (
    <section className="l-section l-pricing-section" id="pricing">
      <div className="l-section-inner">
        <p className="l-eyebrow">Pricing</p>
        <h2>Less than a coffee. More than a class.</h2>
        <p className="l-why-sub" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          A private French tutor costs $50/hour and requires scheduling, commuting, and performing.
          GetFrench Pro costs $2/hour — and you can show up in your pajamas and say everything wrong.
        </p>
        <div className="l-billing-toggle">
          <button className={yearly ? 'active' : ''} onClick={() => setYearly(true)}>
            Yearly <span className="l-save-tag">Save 23%</span>
          </button>
          <button className={!yearly ? 'active' : ''} onClick={() => setYearly(false)}>Monthly</button>
        </div>
        <div className="l-pricing-grid">
          {PLANS.map(plan => (
            <div key={plan.id} className={`l-pricing-card${plan.popular ? ' l-pricing-card--popular' : ''}`}>
              {plan.popular && <span className="l-popular-tag">Most Popular</span>}
              <p className="l-plan-name">{plan.name}</p>
              <div className="l-plan-price">
                {plan.monthly === 0
                  ? <span className="l-price-big">Free</span>
                  : <><span className="l-price-big">${yearly ? plan.yearly : plan.monthly}</span><span className="l-price-period">/mo</span></>
                }
              </div>
              {yearly && plan.monthly > 0 && (
                <p className="l-price-note">billed ${(plan.yearly * 12).toFixed(2)}/yr</p>
              )}
              <p className="l-plan-desc">
                {plan.sessions ? `${plan.sessions} sessions / month` : `${plan.hours} hours / month`}
              </p>
              <button
                className={plan.popular ? 'l-btn-coral' : 'l-btn-outline'}
                onClick={() => navigate('/onboarding')}
              >
                {plan.monthly === 0 ? 'Start free' : 'Get started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LInstall() {
  return (
    <section className="l-section l-install-section">
      <div className="l-section-inner">
        <p className="l-eyebrow">Install</p>
        <h2>No app store needed</h2>
        <p className="l-install-sub">Add GetFrench to your iPhone home screen in seconds.</p>
        <div className="l-install-content">
          <div className="l-install-steps">
            {[
              { n: '1', text: <>Open <strong>getfrench.app</strong> in Safari</> },
              { n: '2', text: <>Tap the <strong>Share</strong> button at the bottom</> },
              { n: '3', text: <>Select <strong>&quot;Add to Home Screen&quot;</strong></> },
            ].map(s => (
              <div key={s.n} className="l-step">
                <span>{s.n}</span>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <div className="l-qr-wrap">
            <QRCodeSVG value="https://getfrench.app" size={148} fgColor="#001858" bgColor="transparent" />
            <p>Scan to open on iPhone</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LFooter() {
  return (
    <footer className="l-footer">
      <p>GetFrench &mdash; Speak French without the fear</p>
      <a href="/story" className="l-footer-link">Our story</a>
    </footer>
  );
}

function MicSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
