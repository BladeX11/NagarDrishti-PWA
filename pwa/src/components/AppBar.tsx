import { Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppBarProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  right?: React.ReactNode;
}

export function AppBar({ title, showBack = false, backPath = '/', right }: AppBarProps) {
  const navigate = useNavigate();

  return (
    <header className="app-bar">
      {/* Left: logo or back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {showBack ? (
          <button
            className="btn btn-outline btn-icon"
            onClick={() => navigate(backPath)}
            aria-label="Go back"
            style={{ minHeight: 40, width: 40, height: 40, border: '2px solid var(--color-border)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        ) : (
          /* Bauhaus logo mark: circle + square + triangle */
          <button
            className="logo-mark"
            onClick={() => navigate('/')}
            aria-label="NagarDrishti home"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span className="shape shape-circle" aria-hidden="true" />
            <span className="shape shape-square" aria-hidden="true" />
            <span className="shape shape-tri" aria-hidden="true" />
          </button>
        )}

        <div>
          {title ? (
            <h1 style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
              {title}
            </h1>
          ) : (
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7060', display: 'block' }}>
                Civic Issues
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--color-primary)', lineHeight: 1 }}>
                NagarDrishti
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {right ?? (
          <>
            <button
              className="btn btn-outline btn-icon"
              aria-label="Notifications"
              style={{ minHeight: 40, width: 40, height: 40, border: '2px solid var(--color-border)' }}
              onClick={() => navigate('/alerts')}
            >
              <Bell size={18} aria-hidden="true" />
            </button>
            <button
              className="btn btn-outline btn-icon"
              aria-label="Settings"
              style={{ minHeight: 40, width: 40, height: 40, border: '2px solid var(--color-border)' }}
              onClick={() => navigate('/settings')}
            >
              <Settings size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
