import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import './Story.css';

export default function Story() {
  const navigate = useNavigate();
  return (
    <div className="st-page">
      <nav className="st-nav">
        <button className="st-nav-brand" onClick={() => navigate('/')}>
          <Logo size={28} />
          <span>GetFrench</span>
        </button>
        <button className="st-back" onClick={() => navigate('/')}>
          ← Back to GetFrench
        </button>
      </nav>

      <article className="st-content">

        <h1>My name is Ahmed.</h1>

        <p>I grew up in Saint-Étienne, France.</p>

        <p>I studied English for years in school.
          Grammar rules, vocabulary lists, written exercises. On paper, I was decent.</p>

        <p>Then in April 2025, my family and I moved to Toronto.</p>

        <p>And everything I had learned disappeared.</p>

        <p>Real people don&rsquo;t speak like textbooks. Their accents, their rhythm, their
          expressions — nothing matched what I had studied. In meetings, at the grocery store,
          with neighbors, I understood maybe 60% of what was said. And when it was my turn
          to speak, I froze.</p>

        <p>Not because I didn&rsquo;t know English. Because I was terrified of making mistakes
          in front of real people.</p>

        <p>Then something unexpected happened.</p>

        <p>I watched my kids on their first day at school in Toronto. They spoke zero English.
          Not a single grammar rule. Not a single word of vocabulary.</p>

        <p>Within months, they were fluent.</p>

        <p>They didn&rsquo;t study. They didn&rsquo;t worry about mistakes. They just spoke.
          Because they had no choice. And no fear.</p>

        <p>That&rsquo;s when I understood something that changed everything for me.</p>

        <p>Fear is not about level. It&rsquo;s not about grammar. It&rsquo;s about the courage
          to start, imperfectly.</p>

        <p>Shortly after, I noticed something else. My English-speaking colleagues, born and
          raised here, would apologize before speaking French. They had studied it for years.
          They knew the rules. But in front of a French speaker, they froze. Exactly like
          I did with English.</p>

        <p>The fear of judgment has no language.</p>

        <p>That&rsquo;s why I built GetFrench. Not a course. Not a grammar app. A safe place
          to practice French the way my kids learned English — by speaking, making mistakes,
          and not being afraid.</p>

        <blockquote>
          Your French doesn&rsquo;t have to be perfect. It just has to start.
        </blockquote>

        <p className="st-signature">Ahmed, founder of GetFrench</p>

        <div className="st-cta">
          <button className="st-cta-btn" onClick={() => navigate('/onboarding')}>
            Start for free →
          </button>
        </div>

      </article>
    </div>
  );
}
