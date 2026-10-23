import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setRole } from './lib/api';
import { authApi } from './lib/api';
import { AuthGate } from './components/auth/AuthGate';
import { flushQueuedSubmissions } from './pwa/offlineQueue';
import { issuesApi } from './lib/api';
import './index.css';

// Keep the demo role only for local prototype switching. Production uses AuthGate + OTP.
if (import.meta.env.DEV && !localStorage.getItem('nd-role')) setRole('citizen');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('[pwa] service worker registration failed', error);
    });
  });
}

const syncOfflineReports = () => {
  void flushQueuedSubmissions((payload) => issuesApi.create(payload));
};
window.addEventListener('online', syncOfflineReports);
if (navigator.onLine) syncOfflineReports();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate><App /></AuthGate>
  </StrictMode>,
);
