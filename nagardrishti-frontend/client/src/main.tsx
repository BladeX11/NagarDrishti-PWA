import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setRole } from './lib/api';
import './index.css';

// Mock auth: default to 'citizen' role if none is set.
// Officers/admins can switch via the "Switch role" control in the UI.
if (!localStorage.getItem('nd-role')) {
  setRole('citizen');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
