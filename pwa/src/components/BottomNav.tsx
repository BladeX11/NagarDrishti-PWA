import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, Plus, FileText, Bell } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',         icon: Home,     label: 'Home'    },
  { path: '/map',      icon: MapPin,   label: 'Map'     },
  // Centre FAB is the report button (not a nav item)
  { path: '/reports',  icon: FileText, label: 'Reports' },
  { path: '/alerts',   icon: Bell,     label: 'Alerts'  },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {/* First two nav items */}
      {NAV_ITEMS.slice(0, 2).map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`bottom-nav-item ${location.pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
          aria-label={label}
          aria-current={location.pathname === path ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={location.pathname === path ? 2.5 : 1.5} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}

      {/* Centre FAB — Report Issue */}
      <div className="bottom-nav-fab">
        <button
          className="bottom-nav-fab-inner"
          onClick={() => navigate('/report')}
          aria-label="Report a new issue"
        >
          <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Last two nav items */}
      {NAV_ITEMS.slice(2).map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`bottom-nav-item ${location.pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
          aria-label={label}
          aria-current={location.pathname === path ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={location.pathname === path ? 2.5 : 1.5} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
