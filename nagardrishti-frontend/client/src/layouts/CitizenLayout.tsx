import { Bell, Camera, Compass, Home, ListChecks, LogOut, MoreHorizontal, Plus, Settings, ChevronRight, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authApi, clearRole } from '../lib/api';
import { formatWardLabel } from '../pages/citizen/constants';
import { InstallPrompt } from '../components/shared/InstallPrompt';
import { PushOptIn } from '../components/shared/PushOptIn';

const links = [
  { to: '/citizen',               label: 'Home',          shortLabel: 'Home',    icon: Home,       end: true  },
  { to: '/citizen/explore',       label: 'Explore map',   shortLabel: 'Explore', icon: Compass,    end: false },
  { to: '/citizen/report',        label: 'Report',        shortLabel: 'Report',  icon: Camera,     end: false },
  { to: '/citizen/my-reports',    label: 'My reports',    shortLabel: 'Reports', icon: ListChecks, end: false },
  { to: '/citizen/notifications', label: 'Notifications', shortLabel: 'Alerts',  icon: Bell,       end: false },
  { to: '/citizen/settings',      label: 'Settings',      shortLabel: 'Settings', icon: Settings,  end: false },
];

// Bottom nav items: Home | Explore | [FAB: Report] | Reports | More
const BOTTOM_NAV = [links[0], links[1], null, links[3], 'more'] as const;

function Mark() {
  return <span className="flex items-center gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full bg-[#B8892D]"/><i className="h-2.5 w-2.5 bg-[#D8C9A8]"/><i className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-white"/></span>;
}

// Routes where the bottom nav + main chrome are hidden (full-screen flows)
const HIDE_NAV_PATHS = ['/citizen/report'];

export function CitizenLayout() {
  const [more, setMore] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [profile, setProfile] = useState<{ id: string; role: string; name: string; ward?: string } | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hideNav = HIDE_NAV_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then(user => {
        if (active) setProfile(user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handlePortalSwitch = async (targetPath: string, isLogout = false) => {
    if (switching) return;
    setSwitching(true);
    setMore(false);
    try {
      await authApi.logout();
    } catch {
      clearRole();
    } finally {
      clearRole();
      setSwitching(false);
      if (isLogout) toast.success('Signed out.');
      navigate(targetPath);
    }
  };

  const wardLabel = profile?.ward ? formatWardLabel(profile.ward) : '';
  const desktopContext = [profile?.name, wardLabel ? `Pune · ${wardLabel}` : 'Pune']
    .filter(Boolean)
    .join(' · ');
  const mobileBadge = wardLabel || profile?.name || 'Citizen';

  return (
    <div className="min-h-dvh bg-[#F5EFE3] text-[#2A3320]">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-4 border-[#2A3320] bg-[#4F5B2A] text-white lg:flex">
        <Link to="/" className="flex items-center gap-3 border-b-2 border-white/20 p-6">
          <Mark/>
          <span><b className="display-title block text-sm">NagarDrishti</b><small className="text-[9px] font-bold uppercase tracking-widest text-white/60">Citizen portal</small></span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {links.map(({to,label,icon:Icon,end}) =>
            <NavLink key={to} to={to} end={end} className={({isActive})=>`flex items-center gap-3 border-l-4 px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors ${isActive?'border-[#B8892D] bg-[#2A3320] text-white':'border-transparent text-white/75 hover:bg-[#3A4420] hover:text-white'}`}>
              <Icon size={17}/>{label}
            </NavLink>
          )}
        </nav>
        <div className="space-y-2 border-t-2 border-white/20 p-4">
          <Link to="/" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white">← Back to home</Link>
          <button
            type="button"
            disabled={switching}
            onClick={() => void handlePortalSwitch('/officer')}
            className="flex w-full items-center justify-between bg-[#3A4420] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider hover:bg-[#2A3320] disabled:opacity-60"
          >
            Switch role: Officer <ChevronRight size={14}/>
          </button>
          <button
            type="button"
            disabled={switching}
            onClick={() => void handlePortalSwitch('/research')}
            className="flex w-full items-center justify-between bg-[#3A4420] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider hover:bg-[#2A3320] disabled:opacity-60"
          >
            Switch role: Research <ChevronRight size={14}/>
          </button>
          <button
            type="button"
            disabled={switching}
            onClick={() => void handlePortalSwitch('/', true)}
            className="flex w-full items-center justify-between border border-white/25 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/85 hover:bg-[#2A3320] disabled:opacity-60"
          >
            Log out <LogOut size={13}/>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="min-h-dvh lg:pl-64">
        {/* Top header — slim on mobile, full actions on tablet/desktop */}
        {!hideNav && (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-2 border-[#2A3320] bg-[#F5EFE3] px-3.5 sm:px-6 lg:h-[72px] lg:border-b-4 lg:px-8">
            <Link to="/" className="flex min-h-[44px] items-center gap-2 lg:hidden">
              <Mark/>
              <span className="display-title text-sm">NagarDrishti</span>
            </Link>
            <p className="hidden text-xs font-bold uppercase tracking-widest text-[#2A3320]/50 lg:block">
              {desktopContext} <span className="mx-2">/</span> Citizen space
            </p>
            <div className="ml-auto flex items-center gap-2">
              <span className="border-2 border-[#2A3320] bg-[#D8C9A8] px-2.5 py-1 text-xs font-bold lg:hidden">
                {mobileBadge}
              </span>
              <Link
                aria-label="Notifications"
                to="/citizen/notifications"
                className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7] hover:bg-[#E8E0D0]"
              >
                <Bell size={18}/>
              </Link>
              <Link
                aria-label="Settings"
                to="/citizen/settings"
                className="hidden h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7] hover:bg-[#E8E0D0] lg:flex"
              >
                <Settings size={17}/>
              </Link>
              <Link
                to="/transparency"
                className="hidden border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider sm:block"
              >
                Public view
              </Link>
              <div className="hidden sm:block">
                <PushOptIn />
              </div>
            </div>
          </header>
        )}

        {/* Mobile push opt-in placed below header so it never crowds the 56px top bar */}
        {!hideNav && (
          <div className="px-4 pt-3 sm:hidden [&:empty]:hidden">
            <PushOptIn />
          </div>
        )}

        {/* Page content — extra bottom padding on mobile to clear the nav */}
        <main className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-9 ${hideNav ? 'py-0' : 'pt-5 pb-28 lg:pb-10'}`}>
          <Outlet/>
        </main>

        {/* Mobile bottom nav — hidden on desktop and on full-screen flows */}
        {!hideNav && (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Main navigation"
          >
            <div className="grid grid-cols-5 border-t-2 border-[#2A3320] bg-[#FDFBF7]">
              {BOTTOM_NAV.map(item => {
                if (item === null) {
                  return (
                    <div key="fab" className="relative flex items-center justify-center">
                      <Link
                        to="/citizen/report"
                        aria-label="Report a new issue"
                        onClick={() => setMore(false)}
                        className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#2A3320] bg-[#B8892D] text-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320] transition-transform active:scale-95"
                      >
                        <Plus size={24} strokeWidth={2.75} aria-hidden="true"/>
                      </Link>
                      <span className="block h-[60px]"/>
                    </div>
                  );
                }
                if (item === 'more') {
                  return (
                    <button
                      key="more"
                      type="button"
                      aria-expanded={more}
                      aria-label="More navigation options"
                      onClick={() => setMore(open => !open)}
                      className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wide ${
                        more ? 'text-[#4F5B2A]' : 'text-[#2A3320]/65'
                      }`}
                    >
                      <MoreHorizontal size={20} strokeWidth={2.2} aria-hidden="true"/>
                      <span>More</span>
                    </button>
                  );
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMore(false)}
                    className={({ isActive }) =>
                      `flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wide ${
                        isActive ? 'text-[#4F5B2A]' : 'text-[#2A3320]/65'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true"/>
                        <span>{item.shortLabel}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}

        {/* "More" mobile bottom sheet */}
        {more && !hideNav && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-[#2A3320]/55 lg:hidden"
            onClick={() => setMore(false)}
          >
            <div
              className="rounded-t-2xl border-t-4 border-[#2A3320] bg-[#FDFBF7] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2.5"
              onClick={event => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between border-b-2 border-[#E8E0D0] pb-3">
                <span className="display-title text-base">Citizen menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMore(false)}
                  className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-white"
                >
                  <X size={18}/>
                </button>
              </div>
              <Link to="/citizen/notifications" onClick={() => setMore(false)} className="flex min-h-[46px] items-center justify-between border-2 border-[#2A3320] bg-white px-4 text-xs font-black uppercase tracking-wider">Notifications <ChevronRight size={16}/></Link>
              <Link to="/citizen/settings" onClick={() => setMore(false)} className="flex min-h-[46px] items-center justify-between border-2 border-[#2A3320] bg-white px-4 text-xs font-black uppercase tracking-wider">Settings <ChevronRight size={16}/></Link>
              <Link to="/transparency" onClick={() => setMore(false)} className="flex min-h-[46px] items-center justify-between border-2 border-[#2A3320] bg-[#D8C9A8] px-4 text-xs font-black uppercase tracking-wider">Public transparency map <ChevronRight size={16}/></Link>
              <button
                type="button"
                disabled={switching}
                onClick={() => void handlePortalSwitch('/officer')}
                className="flex min-h-[46px] w-full items-center justify-between border-2 border-[#2A3320] bg-[#4F5B2A] px-4 text-left text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
              >
                Switch role: Officer <ChevronRight size={16}/>
              </button>
              <button
                type="button"
                disabled={switching}
                onClick={() => void handlePortalSwitch('/research')}
                className="flex min-h-[46px] w-full items-center justify-between border-2 border-[#2A3320] bg-[#2A3320] px-4 text-left text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
              >
                Switch role: Research <ChevronRight size={16}/>
              </button>
              <button
                type="button"
                disabled={switching}
                onClick={() => void handlePortalSwitch('/', true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 border-2 border-red-800 bg-white px-4 text-xs font-black uppercase tracking-wider text-red-900 disabled:opacity-60"
              >
                <LogOut size={15}/> Log out
              </button>
              <Link to="/" onClick={() => setMore(false)} className="flex min-h-[44px] items-center justify-center text-xs font-bold uppercase tracking-wider text-[#2A3320]/70 underline">← Back to home</Link>
            </div>
          </div>
        )}
      </div>
      <InstallPrompt />
    </div>
  );
}
