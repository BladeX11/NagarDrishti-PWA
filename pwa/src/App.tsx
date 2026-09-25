import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useDeviceType } from './hooks/useDeviceType';
import { DesktopPlaceholder } from './components/DesktopPlaceholder';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { MyReportsPage } from './pages/MyReportsPage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';

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

  // ── INTEGRATION SEAM ──────────────────────────────────────────────────────
  // Desktop path: swap <DesktopPlaceholder /> with <WebApp /> when the
  // officer/public web UI is ready. The mobile PWA below stays untouched.
  // ─────────────────────────────────────────────────────────────────────────
  if (device === 'desktop') {
    return <DesktopPlaceholder />;
  }

  // Mobile / tablet → full citizen PWA
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
