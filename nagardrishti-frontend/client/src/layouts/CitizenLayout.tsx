import { Bell, Camera, Compass, Home, ListChecks, Plus, Settings, ChevronRight } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';

const links = [
  { to: '/citizen',              label: 'Home',        icon: Home,       end: true  },
  { to: '/citizen/explore',      label: 'Explore map', icon: Compass,    end: false },
  { to: '/citizen/report',       label: 'Report',      icon: Camera,     end: false },
  { to: '/citizen/my-reports',   label: 'My reports',  icon: ListChecks, end: false },
  { to: '/citizen/notifications', label: 'Notifications', icon: Bell,    end: false },
  { to: '/citizen/settings',     label: 'Settings',    icon: Settings,   end: false },
];

// Bottom nav items: Home | Explore | [FAB: Report] | My Reports | More
const BOTTOM_NAV = [links[0], links[1], null, links[3], links[4]]; // null = FAB slot

function Mark() {
  return <span className="flex items-center gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full bg-[#B8892D]"/><i className="h-2.5 w-2.5 bg-[#D8C9A8]"/><i className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-white"/></span>;
}

// Routes where the bottom nav + main chrome are hidden (full-screen flows)
const HIDE_NAV_PATHS = ['/citizen/report'];

export function CitizenLayout() {
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PATHS.some(p => pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-[#F5EFE3] text-[#2A3320]">
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
          <Link to="/officer" className="flex items-center justify-between bg-[#3A4420] px-3 py-3 text-[10px] font-black uppercase tracking-wider">Switch role: Officer <ChevronRight size={14}/></Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="min-h-screen lg:pl-64">
        {/* Top header — visible on all screen sizes */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-4 border-[#2A3320] bg-[#F5EFE3] px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link to="/" className="flex items-center gap-2 lg:hidden"><Mark/><span className="display-title text-sm">NagarDrishti</span></Link>
          <p className="hidden text-xs font-bold uppercase tracking-widest text-[#2A3320]/50 lg:block">Pune · Ward 12 <span className="mx-2">/</span> Citizen space</p>
          <div className="ml-auto flex items-center gap-2">
            <Link aria-label="Notifications" to="/citizen/notifications" className="border-2 border-[#2A3320] bg-[#FDFBF7] p-2.5 hover:bg-[#E8E0D0]"><Bell size={17}/></Link>
            <Link aria-label="Settings" to="/citizen/settings" className="border-2 border-[#2A3320] bg-[#FDFBF7] p-2.5 hover:bg-[#E8E0D0]"><Settings size={17}/></Link>
            <Link to="/transparency" className="hidden border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider sm:block">Public view</Link>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile to clear the nav */}
        <main className={`mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-9 ${hideNav ? 'pb-0' : 'pb-28 lg:pb-10'}`}>
          <Outlet/>
        </main>

        {/* Mobile bottom nav — hidden on desktop and on full-screen flows */}
        {!hideNav && (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Main navigation"
          >
            <div className="grid grid-cols-5 border-t-4 border-[#2A3320] bg-[#FDFBF7]">
              {BOTTOM_NAV.map((item, idx) => {
                // Centre slot: FAB report button
                if (item === null) {
                  return (
                    <div key="fab" className="relative flex items-center justify-center">
                      {/* Raised FAB sits above the nav bar */}
                      <Link
                        to="/citizen/report"
                        aria-label="Report a new issue"
                        className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#2A3320] bg-[#B8892D] text-white shadow-[4px_4px_0px_0px_#2A3320] transition-transform active:scale-95"
                      >
                        <Plus size={22} strokeWidth={2.5} aria-hidden="true"/>
                      </Link>
                      {/* Spacer so the grid col has height */}
                      <span className="block h-[62px]"/>
                    </div>
                  );
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex min-h-[62px] flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wide ${isActive ? 'text-[#4F5B2A]' : 'text-[#2A3320]/50'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={19} strokeWidth={isActive ? 2.5 : 1.5} aria-hidden="true"/>
                        <span>{item.label.split(' ')[0]}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}

        {/* "More" dropdown (Settings / Back to home) — triggered from last nav slot */}
        {more && !hideNav && (
          <div className="fixed bottom-[68px] right-3 z-50 border-4 border-[#2A3320] bg-[#FDFBF7] p-2 shadow-[4px_4px_0px_0px_#2A3320] lg:hidden">
            <Link to="/citizen/notifications" className="block px-4 py-3 text-xs font-bold uppercase">Notifications</Link>
            <Link to="/citizen/settings" className="block px-4 py-3 text-xs font-bold uppercase">Settings</Link>
            <Link to="/" className="block px-4 py-3 text-xs font-bold uppercase">Back to home</Link>
          </div>
        )}
      </div>
    </div>
  );
}
