import './RecapModal.css';

function getHeaderEmoji(score) {
  if (!score) return '💪';
  if (score >= 8) return '🔥';
  if (score >= 5) return '💪';
  return '🌱';
}

function getStreakLabel(streak) {
  if (streak === 30) return '30 days! Incredible! ⭐';
  if (streak === 7)  return "One week! You're on fire! 🔥";
  if (streak === 3)  return '3 days strong! 💪';
  if (streak >= 7)   return 'On fire! 🔥';
  if (streak === 1)  return 'Great start!';
  return 'Keep it up!';
}

export default function RecapModal({ recap, onClose }) {
  const {
    encouragement,
    fluency_score,
    streak_count,
    session_duration_label,
    strongest_moment,
    next_session_tip,
    words_to_remember,
  } = recap;

  const streak = streak_count || 0;

  const emoji = getHeaderEmoji(fluency_score);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recap-card" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="recap-header">
          <span className="recap-emoji">{emoji}</span>
          {encouragement && (
            <p className="recap-encouragement">{encouragement}</p>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="recap-stats">
          <div className="recap-stat">
            <span className="recap-stat-icon">🎯</span>
            <span className="recap-stat-value">{session_duration_label || 'Practice'}</span>
            <span className="recap-stat-label">Session type</span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-icon">📊</span>
            <span className="recap-stat-value">{fluency_score ? `${fluency_score}/10` : '—'}</span>
            <span className="recap-stat-label">Fluency score</span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-icon">🔥</span>
            <span className="recap-stat-value">{streak} day{streak !== 1 ? 's' : ''}</span>
            <span className="recap-stat-label">{getStreakLabel(streak)}</span>
          </div>
        </div>

        {/* ── Best moment ── */}
        {strongest_moment && (
          <div className="recap-section">
            <span className="recap-section-label">Your best moment</span>
            <div className="recap-quote">
              &ldquo;{strongest_moment}&rdquo;
            </div>
          </div>
        )}

        {/* ── Words to remember ── */}
        {words_to_remember?.length > 0 && (
          <div className="recap-section">
            <span className="recap-section-label">À retenir</span>
            <div className="recap-chips">
              {words_to_remember.slice(0, 3).map((w, i) => (
                <span key={i} className="recap-chip">{w}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Next session tip ── */}
        {next_session_tip && (
          <div className="recap-section">
            <span className="recap-section-label">Next session</span>
            <p className="recap-tip">{next_session_tip}</p>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="recap-actions">
          <button className="recap-cta-primary" onClick={onClose}>
            Nouvelle session
          </button>
          <button className="recap-cta-secondary" disabled aria-disabled="true">
            Share progress
          </button>
        </div>

        {/* ── Footer ── */}
        <p className="recap-footer">
          Your coach remembers everything from this session.
        </p>

      </div>
    </div>
  );
}
