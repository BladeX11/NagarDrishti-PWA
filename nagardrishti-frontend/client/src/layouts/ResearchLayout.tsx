import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  FileCheck2,
  FlaskConical,
  GitCompareArrows,
  Home,
  Layers3,
  LogOut,
  Menu,
  Tags,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../lib/api';

const links = [
  { to: '/research', label: 'Overview', icon: Home, end: true },
  { to: '/research/annotation', label: 'Annotation', icon: Tags },
  { to: '/research/models', label: 'Models', icon: Layers3 },
  { to: '/research/duplicates', label: 'Duplicates', icon: GitCompareArrows },
  { to: '/research/proof-audit', label: 'Proof audit', icon: FileCheck2 },
  { to: '/research/metrics', label: 'Metrics', icon: Activity },
  { to: '/research/audit-ledger', label: 'Audit ledger', icon: BookOpen },
];

export function ResearchLayout() {
  const [menu, setMenu] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((user) => {
        if (active && user?.name) setUserName(user.name);
      })
      .catch(() => {
        // handled by AuthGate
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      toast.success('Signed out.');
      navigate('/');
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : 'Unable to sign out.'
      );
    }
  };

  return (
    <div className="min-h-dvh bg-[#F5EFE3] text-[#2A3320]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-4 border-[#2A3320] bg-[#2A3320] text-white transition-transform lg:translate-x-0 ${
          menu ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/" className="border-b-2 border-white/20 p-6">
          <p className="mb-5 w-fit border-2 border-[#B8892D] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[#D8C9A8]">
            Research mode
          </p>
          <div className="mb-3 flex items-center gap-1">
            <i className="h-3 w-3 rounded-full bg-[#B8892D]" />
            <i className="h-3 w-3 bg-[#D8C9A8]" />
            <i className="h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-white" />
          </div>
          <b className="display-title text-xl">CivicLens</b>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/55">
            {userName ? `${userName} · research` : 'NagarDrishti research'}
          </p>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-4 px-4 py-3 text-xs font-black uppercase tracking-wider ${
                  isActive
                    ? 'border-[#B8892D] bg-[#4F5B2A]'
                    : 'border-transparent text-white/75 hover:bg-[#3A4420]'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t-2 border-white/20 p-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white"
          >
            <ArrowLeft size={12} /> Back to home
          </Link>
          <Link
            to="/transparency"
            className="flex items-center justify-between bg-[#3A4420] px-3 py-3 text-[10px] font-black uppercase tracking-wider"
          >
            Public view <ChevronRight size={14} />
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center justify-between border border-white/25 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/80 hover:bg-[#3A4420] hover:text-white"
          >
            Sign out <LogOut size={13} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#2A3320]/55 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="min-h-dvh min-w-0 lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b-2 border-[#2A3320] bg-[#F5EFE3] px-4 sm:px-6 lg:border-b-4 lg:px-8">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7] lg:hidden"
            aria-label="Open research navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <p className="display-title min-w-0 truncate text-sm">
            CivicLens{' '}
            <span className="hidden font-medium text-[#2A3320]/45 sm:inline">
              / evaluation workspace
            </span>
          </p>
          <span className="ml-auto hidden border-2 border-[#B8892D] bg-[#B8892D]/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#B8892D] sm:inline-flex">
            <FlaskConical size={13} className="mr-2" />
            Evaluation &amp; audit
          </span>
          <Link
            to="/"
            className="ml-auto inline-flex min-h-[40px] shrink-0 items-center gap-1 px-2 text-xs font-black uppercase tracking-wider hover:underline sm:ml-3 sm:text-[9px]"
          >
            Home <ArrowUpRight size={12} />
          </Link>
        </header>
        <main className="mx-auto max-w-[1440px] min-w-0 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-9">
          <Outlet />
          <p className="mt-9 border-t-2 border-[#D8C9A8] pt-4 text-xs font-bold uppercase tracking-wider text-[#2A3320]/55 sm:text-[9px]">
            CivicLens · Model evaluation, annotation &amp; audit ledger
          </p>
        </main>
      </div>
    </div>
  );
}
