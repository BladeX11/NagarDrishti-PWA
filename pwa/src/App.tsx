import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useDeviceType } from './hooks/useDeviceType';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MyReportsPage } from './pages/MyReportsPage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';

// The desktop dashboard runs on port 3000 (separate Vite app)
const DASHBOARD_URL = 'http://localhost:3000';

// Hide bottom nav on full-screen flows
const HIDE_NAV_PATHS = ['/report'];

function BottomNavConditional() {
  const { pathname } = useLocation();
  if (HIDE_NAV_PATHS.includes(pathname)) return null;
  return <BottomNav />;
}

function AppShell() {
  return (
    <>
      <Routes>
        <Route path="/"        element={<HomePage />}        />
        <Route path="/map"     element={<MapPage />}         />
        <Route path="/report"  element={<ReportIssuePage />} />
        <Route path="/reports" element={<MyReportsPage />}   />
        <Route path="/alerts"  element={<AlertsPage />}      />
        <Route path="*"        element={<HomePage />}        />
      </Routes>
      <BottomNavConditional />
    </>
  );
}

export default function App() {
  const device = useDeviceType();

  // Desktop → redirect to the main officer/public dashboard app
  if (device === 'desktop') {
    window.location.replace(DASHBOARD_URL);
    // Show nothing while the redirect happens
    return null;
  }

  // Mobile / tablet → citizen PWA
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
