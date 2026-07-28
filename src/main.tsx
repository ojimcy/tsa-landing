import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './app';
import AboutPage from './pages/about';
import PrivacyPage from './pages/privacy';
import TermsPage from './pages/terms';
import DeleteAccountPage from './pages/delete-account';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Submitted to the app stores as the privacy-policy and terms URLs —
            these paths must stay stable. */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        {/* Submitted to Apple (5.1.1(v)) and Google Play as the account-deletion
            URL — must stay reachable without signing in. */}
        <Route path="/delete-account" element={<DeleteAccountPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
