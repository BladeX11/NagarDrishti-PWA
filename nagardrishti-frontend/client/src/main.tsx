import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {
  AUTH_CHANGED_EVENT,
  AUTH_READY_EVENT,
  type AuthUser,
  issuesApi,
  setRole,
} from './lib/api';
import { flushQueuedSubmissions } from './pwa/offlineQueue';
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

let citizenAuthReady = false;

const syncOfflineReports = () => {
  if (!citizenAuthReady || !navigator.onLine) return;
  void flushQueuedSubmissions((payload) => issuesApi.create(payload));
};

window.addEventListener(AUTH_READY_EVENT, (event) => {
  const user = (event as CustomEvent<AuthUser>).detail;
  citizenAuthReady = user?.role === 'citizen';
  syncOfflineReports();
});

window.addEventListener(AUTH_CHANGED_EVENT, (event) => {
  const detail = (event as CustomEvent<{ user: AuthUser | null }>).detail;
  citizenAuthReady = detail?.user?.role === 'citizen';
  if (citizenAuthReady) syncOfflineReports();
});

window.addEventListener('online', syncOfflineReports);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
