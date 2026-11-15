import { Bell, ChevronRight, ClipboardList, Home, LogOut, Menu, Search, ShieldCheck } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { authApi, issuesApi, notificationsApi } from '../lib/api';

const links = [
  { to: '/officer', label: 'Overview', icon: Home, end: true },
  { to: '/officer/queue', label: 'Triage queue', icon: ClipboardList },
];

type OfficerNotification = {
  id: string;
  issueId: string;
  title: string;
  body: string;
  kind: string;
  time: string;
  unread: boolean;
};

export function OfficerLayout() {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<OfficerNotification[]>([]);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('Officer');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void authApi
      .me()
      .then(user => {
        if (active && user?.name) setOfficerName(user.name);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function toggleNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (!next) return;
    try {
      const items = await notificationsApi.list();
      setNotifications(items);
      setNotifError(null);
    } catch (err: any) {
      setNotifError(err?.message || 'Unable to load notifications.');
    }
  }

  async function handleSearch(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || searching) return;
    const raw = search.trim();
    if (!raw) return;
    setSearching(true);
    try {
      if (/^(ND-|^[0-9a-f]{8}-)/i.test(raw)) {
        try {
          const exact = await issuesApi.get(raw);
          if (exact) {
            navigate(`/officer/issue/${exact.publicRef || exact.id}`);
            setSearch('');
            return;
          }
        } catch {
          // Fall back to list search by title/ref
        }
      }
      const result = await issuesApi.list({ limit: 100 });
      const q = raw.toLowerCase();
      const match = result.items.find(
        item =>
          (item.publicRef && item.publicRef.toLowerCase() === q) ||
          item.id.toLowerCase() === q ||
          item.title.toLowerCase().includes(q)
      );
      if (match) {
        navigate(`/officer/issue/${match.publicRef || match.id}`);
        setSearch('');
      } else {
        toast.error('No matching issue found. Try an issue ref (e.g. ND-104) or title keyword.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to search issues.');
    } finally {
      setSearching(false);
    }
  }

  async function handleLogoutOrSwitch(targetPath: string) {
    try {
      await authApi.logout();
    } catch {
      // Proceed with navigation even if session was already cleared
    }
    setMenu(false);
    navigate(targetPath);
  }

  return (
    <div className="min-h-screen bg-[#F5EFE3] text-[#2A3320]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-4 border-[#2A3320] bg-[#2A3320] text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" className="border-b-2 border-white/20 p-6">
          <div className="mb-4 flex items-center gap-1">
            <i className="h-3 w-3 rounded-full bg-[#B8892D]" />
            <i className="h-3 w-3 bg-[#D8C9A8]" />
            <i className="h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-white" />
          </div>
          <b className="display-title block text-xl">NagarDrishti</b>
          <small className="text-[9px] font-bold uppercase tracking-widest text-white/55">Officer workspace</small>
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
                  isActive ? 'border-[#B8892D] bg-[#4F5B2A] text-white' : 'border-transparent text-white/75 hover:bg-[#3A4420]'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t-2 border-white/20 p-4">
          <Link to="/" onClick={() => setMenu(false)} className="block py-1 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white">
            ← Back to home
          </Link>
          <button
            type="button"
            onClick={() => void handleLogoutOrSwitch('/citizen')}
            className="flex w-full items-center justify-between bg-[#3A4420] px-3 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-[#4F5B2A]"
          >
            Switch to citizen <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => void handleLogoutOrSwitch('/')}
            className="flex w-full items-center justify-between border border-white/25 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/85 hover:bg-white/10"
          >
            Sign out <LogOut size={14} />
          </button>
        </div>
      </aside>
      {menu && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-[#2A3320]/55 lg:hidden" onClick={() => setMenu(false)} />}
      <div className="min-h-dvh lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b-2 border-[#2A3320] bg-[#F5EFE3] px-4 sm:px-6 lg:border-b-4 lg:px-8">
          <button className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7] lg:hidden" aria-label="Open navigation" onClick={() => setMenu(!menu)}>
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <p className="display-title truncate text-sm">Welcome, {officerName}.</p>
            <p className="hidden text-[9px] font-bold uppercase tracking-widest text-[#2A3320]/50 sm:block">Ward operations console</p>
          </div>
          <div className="ml-auto hidden max-w-xs flex-1 items-center gap-2 border-2 border-[#2A3320] bg-white px-3 py-2 md:flex">
            <Search size={14} />
            <input
              aria-label="Search issues"
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => void handleSearch(event)}
              placeholder="Search issues or IDs…"
              className="w-full border-0 bg-transparent text-xs outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleLogoutOrSwitch('/citizen')}
            className="hidden border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider sm:block"
          >
            Citizen view
          </button>
          <div className="relative ml-auto md:ml-0">
            <button
              type="button"
              onClick={() => void toggleNotifications()}
              aria-label="Officer notifications"
              aria-expanded={notifOpen}
              className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7]"
            >
              <Bell size={18} />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-13 z-50 w-80 border-4 border-[#2A3320] bg-[#FDFBF7] p-4 shadow-[6px_6px_0px_0px_#2A3320]">
                <div className="mb-3 flex items-center justify-between border-b-2 border-[#E8E0D0] pb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4F5B2A]">Officer alerts</p>
                  <Link
                    to="/officer/queue"
                    onClick={() => setNotifOpen(false)}
                    className="text-[9px] font-black uppercase tracking-wider text-[#4F5B2A] underline"
                  >
                    Open queue →
                  </Link>
                </div>
                {notifError ? (
                  <p className="text-xs text-[#8B4513]">{notifError}</p>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-[#2A3320]/65">No new alerts right now.</p>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {notifications.slice(0, 8).map(item => (
                      <Link
                        key={item.id}
                        to={item.issueId ? `/officer/issue/${item.issueId}` : '/officer/queue'}
                        onClick={() => setNotifOpen(false)}
                        className="block border-b border-[#E8E0D0] pb-2 last:border-0 hover:bg-[#D8C9A8]/20"
                      >
                        <p className="text-xs font-black">{item.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#2A3320]/70">{item.body}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <div className="border-b-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-2.5 md:hidden">
          <label className="flex min-h-[44px] items-center gap-2 border-2 border-[#2A3320] bg-white px-3">
            <Search size={16} />
            <input
              aria-label="Search issues on mobile"
              value={search}
              onChange={event => setSearch(event.target.value)}
              onKeyDown={event => void handleSearch(event)}
              placeholder="Search issue ID (e.g. ND-104)…"
              className="w-full border-0 bg-transparent text-xs outline-none"
            />
          </label>
        </div>
        <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-9">
          <Outlet />
          <p className="mt-9 border-t-2 border-[#D8C9A8] pt-4 text-xs font-bold uppercase tracking-wider text-[#2A3320]/55 sm:text-[9px]">
            Officer console · <ShieldCheck className="inline" size={12} /> privacy-coarsened location
          </p>
        </main>
      </div>
    </div>
  );
}
