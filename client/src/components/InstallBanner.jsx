import { useState, useEffect } from 'react';
import './InstallBanner.css';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari, not already installed, not dismissed
    if (!isIOS()) return;
    if (isInStandaloneMode()) return;
    if (localStorage.getItem('getfrench_install_dismissed')) return;

    // Show after a 3s delay so it doesn't interrupt first load
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('getfrench_install_dismissed', '1');
  };

  return (
    <div className="install-banner">
      <div className="install-banner__content">
        <img src="/icons/icon-120.png" alt="GetFrench" className="install-banner__icon" />
        <div className="install-banner__text">
          <strong>Add to Home Screen</strong>
          <span>
            Tap <ShareIcon /> then "Add to Home Screen" for the best experience.
          </span>
        </div>
      </div>
      <button className="install-banner__close" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
      <div className="install-banner__arrow" />
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
