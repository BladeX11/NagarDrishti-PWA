import { Link, NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/transparency', label: 'Issue map', end: true },
  { to: '/transparency/scorecards', label: 'Scorecards' },
  { to: '/transparency/sla-breaches', label: 'SLA breaches' },
  { to: '/transparency/forgotten', label: 'Forgotten' },
];

export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-[#F5EFE3] text-[#2A3320]">
      <header className="sticky top-0 z-40 border-b-2 border-[#2A3320] bg-[#F5EFE3] lg:border-b-4">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-auto sm:px-6 sm:py-3 lg:px-8">
          <Link to="/" className="flex min-h-[44px] shrink-0 items-center gap-2">
            <span className="flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-full bg-[#B8892D]" />
              <i className="h-2.5 w-2.5 bg-[#4F5B2A]" />
              <i className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-[#2A3320]" />
            </span>
            <b className="display-title text-sm">NagarDrishti</b>
          </Link>
          <nav className="hidden items-center gap-5 lg:flex">
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `border-b-4 py-4 text-[10px] font-black uppercase tracking-wider ${
                    isActive ? 'border-[#B8892D] text-[#2A3320]' : 'border-transparent text-[#2A3320]/60 hover:text-[#2A3320]'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/citizen"
              className="inline-flex min-h-[40px] items-center border-2 border-[#2A3320] bg-[#4F5B2A] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white sm:text-[9px]"
            >
              Citizen demo
            </Link>
            <Link
              to="/"
              className="hidden min-h-[40px] items-center border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider sm:inline-flex"
            >
              ← Home
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t-2 border-[#D8C9A8] px-3 lg:hidden">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex min-h-[44px] shrink-0 items-center border-b-4 px-2.5 text-xs font-black uppercase tracking-wide ${
                  isActive ? 'border-[#B8892D] text-[#2A3320]' : 'border-transparent text-[#2A3320]/65'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="min-h-[calc(100dvh-160px)]">
        <Outlet />
      </main>
      <footer className="border-t-4 border-[#2A3320] bg-[#2A3320] px-4 py-7 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="display-title text-sm">NagarDrishti</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/60 sm:text-[9px]">
              Civic information, made visible.
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/65 sm:text-[9px]">
            Public pins are coarsened · Demo data · Pune, India
          </p>
          <Link to="/research" className="text-xs font-black uppercase tracking-wider text-[#D8C9A8] hover:underline sm:text-[9px]">
            CivicLens research ↗
          </Link>
        </div>
      </footer>
    </div>
  );
}
