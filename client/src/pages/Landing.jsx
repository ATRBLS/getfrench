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

const TESTIMONIALS = [
  {
    name: 'Julie M.',
    role: 'Parent, Ottawa',
    text: "I studied French for 10 years and still froze every time a francophone colleague spoke to me. Two weeks with GetFrench and I stopped rehearsing sentences in my head before saying them. I just speak.",
    level: 'A2 → B1',
  },
  {
    name: 'David T.',
    role: 'Federal Government Analyst, Gatineau',
    text: "My bilingualism test was the only thing standing between me and a promotion. I knew the grammar — I just couldn't get the words out without panicking. GetFrench broke that block. I passed.",
    level: 'B1 → B2',
  },
  {
    name: 'Priya S.',
    role: 'Marketing Director, Montreal',
    text: "Moving to Quebec, I dreaded every meeting. With GetFrench I could make every mistake privately, every day, until it stopped feeling like a mistake. Now I speak first.",
    level: 'B2 → C1',
  },
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
      <LTestimonials />
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
          <button className="l-nav-cta" onClick={() => navigate('/auth')}>Start free →</button>
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
          <button className="l-btn-coral" onClick={() => navigate('/auth')}>Speak for free →</button>
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
  return (
    <section className="l-why" id="pain">
      <div className="l-why-orbs" aria-hidden="true">
        <div className="l-why-orb l-why-orb--coral" />
        <div className="l-why-orb l-why-orb--sky" />
      </div>
      <div className="l-why-inner">
        <p className="l-eyebrow l-eyebrow--light">The real problem</p>
        <h2>
          You don&rsquo;t have a French problem.<br />
          <span className="l-accent-sky">You have a fear problem.</span>
        </h2>
        <p className="l-why-sub">
          You&rsquo;ve taken classes. You know the grammar. You understand when someone speaks to you.
          But the moment you have to open your mouth — in front of a colleague, a store clerk, a client —
          your mind goes blank. You second-guess every word. You stay silent.
        </p>
        <p className="l-why-sub" style={{ marginTop: '1rem' }}>
          That&rsquo;s not a vocabulary gap. That&rsquo;s the brain shutting down under social pressure.
          And no textbook, no app, no grammar exercise fixes it.
          <strong> The only thing that fixes it is speaking. A lot. Without fear.</strong>
        </p>
        <div className="l-why-stats">
          {[
            { value: '0', label: 'judgments. Ever.' },
            { value: '24/7', label: 'available when the fear hits' },
            { value: '3×', label: 'faster progress speaking vs. studying' },
          ].map(s => (
            <div key={s.value} className="l-stat">
              <span>{s.value}</span>
              <p>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LHow() {
  const cards = [
    {
      icon: '🎙️',
      title: 'No one is watching',
      desc: 'With a real person, every mistake feels embarrassing. With GetFrench, you can say "j\'ai allé au magasin" without anyone flinching. Make the mistake. Hear the correction. Move on.',
    },
    {
      icon: '🔄',
      title: 'You learn by speaking, not studying',
      desc: 'Apps teach grammar. Textbooks teach vocabulary. Neither teaches your mouth to form French words under pressure. GetFrench does — one real conversation at a time.',
    },
    {
      icon: '📈',
      title: 'Confidence compounds',
      desc: 'The first session is hard. The third one feels natural. Every mistake you make safely here is one less block in the real world. Your French was never the problem.',
    },
  ];
  return (
    <section className="l-section" id="how">
      <div className="l-section-inner">
        <p className="l-eyebrow">How it works</p>
        <h2>A private space to find your French voice</h2>
        <div className="l-how-grid">
          {cards.map(c => (
            <div key={c.title} className="l-card">
              <span className="l-card-icon">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="l-how-extra">
          <div className="l-how-extra-card">
            <p className="l-how-extra-label">Also</p>
            <ul className="l-how-extra-list">
              <li>Remembers your level, your goals, and your weak points across every session</li>
              <li>Adapts vocabulary and pace from A1 to C2 in real time</li>
              <li>Available at 11pm when you just bombed a French conversation and need to rebuild</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function LTestimonials() {
  return (
    <section className="l-section">
      <div className="l-section-inner">
        <p className="l-eyebrow">Real stories</p>
        <h2>The moment the block broke</h2>
        <div className="l-testimonials">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="l-testimonial">
              <div className="l-stars">★★★★★</div>
              <p className="l-quote-text">&ldquo;{t.text}&rdquo;</p>
              <div className="l-testimonial-footer">
                <div className="l-avatar">{t.name[0]}</div>
                <div>
                  <p className="l-author">{t.name}</p>
                  <p className="l-author-role">{t.role}</p>
                </div>
                <span className="l-level-pill">{t.level}</span>
              </div>
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
                onClick={() => navigate('/auth')}
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
