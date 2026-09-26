import { Bell, Camera, Compass, Home, ListChecks, Settings, ChevronRight } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

const links = [
  { to: '/citizen', label: 'Home', icon: Home, end: true },
  { to: '/citizen/explore', label: 'Explore map', icon: Compass },
  { to: '/citizen/report', label: 'Report an issue', icon: Camera },
  { to: '/citizen/my-reports', label: 'My reports', icon: ListChecks },
  { to: '/citizen/notifications', label: 'Notifications', icon: Bell },
  { to: '/citizen/settings', label: 'Settings', icon: Settings },
];
function Mark() { return <span className="flex items-center gap-1.5" aria-hidden="true"><i className="h-2.5 w-2.5 rounded-full bg-[#B8892D]"/><i className="h-2.5 w-2.5 bg-[#D8C9A8]"/><i className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-white"/></span>; }

export function CitizenLayout() {
  const [more, setMore] = useState(false);
  return <div className="min-h-screen bg-[#F5EFE3] text-[#2A3320]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-4 border-[#2A3320] bg-[#4F5B2A] text-white lg:flex">
      <Link to="/" className="flex items-center gap-3 border-b-2 border-white/20 p-6"><Mark/><span><b className="display-title block text-sm">NagarDrishti</b><small className="text-[9px] font-bold uppercase tracking-widest text-white/60">Citizen portal</small></span></Link>
      <nav className="flex-1 space-y-1 p-3">{links.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive})=>`flex items-center gap-3 border-l-4 px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors ${isActive?'border-[#B8892D] bg-[#2A3320] text-white':'border-transparent text-white/75 hover:bg-[#3A4420] hover:text-white'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
      <div className="space-y-2 border-t-2 border-white/20 p-4"><Link to="/" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white">← Back to home</Link><Link to="/officer" className="flex items-center justify-between bg-[#3A4420] px-3 py-3 text-[10px] font-black uppercase tracking-wider">Switch role: Officer <ChevronRight size={14}/></Link></div>
    </aside>
    <div className="min-h-screen lg:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-4 border-[#2A3320] bg-[#F5EFE3] px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link to="/" className="flex items-center gap-2 lg:hidden"><Mark/><span className="display-title text-sm">NagarDrishti</span></Link>
        <p className="hidden text-xs font-bold uppercase tracking-widest text-[#2A3320]/50 lg:block">Pune · Ward 12 <span className="mx-2">/</span> Citizen space</p>
        <div className="ml-auto flex items-center gap-2"><Link aria-label="Notifications" to="/citizen/notifications" className="border-2 border-[#2A3320] bg-[#FDFBF7] p-2.5 hover:bg-[#E8E0D0]"><Bell size={17}/></Link><Link aria-label="Settings" to="/citizen/settings" className="border-2 border-[#2A3320] bg-[#FDFBF7] p-2.5 hover:bg-[#E8E0D0]"><Settings size={17}/></Link><Link to="/transparency" className="hidden border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider sm:block">Public view</Link></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-9"><Outlet/></main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t-4 border-[#2A3320] bg-[#FDFBF7] lg:hidden">
        {[links[0],links[1],links[2],links[3],links[5]].map(({to,label,icon:Icon},index)=><NavLink key={to} to={to} onClick={index===4?()=>setMore(!more):undefined} className={({isActive})=>`relative flex min-h-[62px] flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wide ${isActive?'text-[#4F5B2A]':'text-[#2A3320]/50'} ${index===2?'bg-[#B8892D]/20':''}`}><Icon size={17} strokeWidth={2.5}/><span>{index===2?'Report':index===4?'More':label.split(' ')[0]}</span></NavLink>)}
      </nav>
      {more && <div className="fixed bottom-[68px] right-3 z-50 border-4 border-[#2A3320] bg-[#FDFBF7] p-2 shadow-[4px_4px_0px_0px_#2A3320] lg:hidden"><Link to="/citizen/notifications" className="block px-4 py-3 text-xs font-bold uppercase">Notifications</Link><Link to="/citizen/settings" className="block px-4 py-3 text-xs font-bold uppercase">Settings</Link><Link to="/" className="block px-4 py-3 text-xs font-bold uppercase">Back to home</Link></div>}
    </div>
  </div>;
}
