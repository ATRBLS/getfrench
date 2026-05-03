import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import './styles/design.css';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import AppPage from './pages/App';
import Onboarding from './pages/Onboarding';
import InstallBanner from './components/InstallBanner';
import { isAuthenticated } from './lib/auth';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/auth" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/verify" element={<Auth />} />
        <Route path="/app" element={
          <PrivateRoute>
            <AppPage />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallBanner />
    </BrowserRouter>
  </StrictMode>
);

const splash = document.getElementById('splash');
if (splash) {
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 400);
  }, 600);
}
