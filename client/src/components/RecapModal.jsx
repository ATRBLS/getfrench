import './RecapModal.css';

export default function RecapModal({ recap, onClose }) {
  const {
    cefr_level,
    cefr_previous,
    level_improved,
    topics_discussed,
    words_to_remember,
    encouragement,
  } = recap;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recap-card" onClick={e => e.stopPropagation()}>

        <div className={`cefr-display${level_improved ? ' cefr-display--improved' : ''}`}>
          <span className="cefr-big">{cefr_level || '?'}</span>
          {level_improved && cefr_previous && (
            <span className="level-up-tag">Level up! {cefr_previous} → {cefr_level}</span>
          )}
        </div>

        {encouragement && (
          <p className="recap-encouragement">{encouragement}</p>
        )}

        {topics_discussed?.length > 0 && (
          <div className="recap-section">
            <span className="recap-label">Sujets de la session</span>
            <div className="recap-chips">
              {topics_discussed.slice(0, 4).map((t, i) => (
                <span key={i} className="recap-chip">{t}</span>
              ))}
            </div>
          </div>
        )}

        {words_to_remember?.length > 0 && (
          <div className="recap-section">
            <span className="recap-label">Mots à retenir</span>
            <div className="recap-chips">
              {words_to_remember.slice(0, 3).map((w, i) => (
                <span key={i} className="recap-chip recap-chip--word">{w}</span>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={onClose}>
          Nouvelle session
        </button>
      </div>
    </div>
  );
}
