import { Bell, ChevronRight, ClipboardList, Home, Menu, Search, ShieldCheck, X } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { issues } from '../data/seed';

const links = [{to:'/officer',label:'Overview',icon:Home,end:true},{to:'/officer/queue',label:'Triage queue',icon:ClipboardList}];
export function OfficerLayout(){
  const [menu,setMenu]=useState(false);
  const [search,setSearch]=useState('');const navigate=useNavigate();
  function handleSearch(event:KeyboardEvent<HTMLInputElement>){if(event.key!=='Enter')return;const query=search.trim().toLowerCase();if(!query)return;const issue=issues.find(item=>item.id.toLowerCase()===query||item.title.toLowerCase().includes(query));if(issue){navigate(`/officer/issue/${issue.id}`);setSearch('');}else toast.error('No matching demo issue. Try an issue ID such as ND-104.');}
  return <div className="min-h-screen bg-[#F5EFE3] text-[#2A3320]">
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-4 border-[#2A3320] bg-[#2A3320] text-white transition-transform lg:translate-x-0 ${menu?'translate-x-0':'-translate-x-full'}`}>
      <Link to="/" className="border-b-2 border-white/20 p-6"><div className="mb-4 flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-[#B8892D]"/><i className="h-3 w-3 bg-[#D8C9A8]"/><i className="h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-white"/></div><b className="display-title block text-xl">NagarDrishti</b><small className="text-[9px] font-bold uppercase tracking-widest text-white/55">Officer workspace</small></Link>
      <nav className="flex-1 space-y-1 p-3">{links.map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} onClick={()=>setMenu(false)} className={({isActive})=>`flex items-center gap-3 border-l-4 px-4 py-3 text-xs font-black uppercase tracking-wider ${isActive?'border-[#B8892D] bg-[#4F5B2A] text-white':'border-transparent text-white/75 hover:bg-[#3A4420]'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
      <div className="border-t-2 border-white/20 p-4"><Link to="/" className="block py-2 text-[10px] font-bold uppercase tracking-wider text-white/70">← Back to home</Link><Link to="/citizen" className="flex items-center justify-between bg-[#3A4420] px-3 py-3 text-[10px] font-black uppercase tracking-wider">Switch to citizen <ChevronRight size={14}/></Link></div>
    </aside>
    {menu&&<button aria-label="Close menu" className="fixed inset-0 z-40 bg-[#2A3320]/55 lg:hidden" onClick={()=>setMenu(false)}/>}
    <div className="min-h-dvh lg:pl-72">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b-2 border-[#2A3320] bg-[#F5EFE3] px-4 sm:px-6 lg:border-b-4 lg:px-8">
        <button className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7] lg:hidden" aria-label="Open navigation" onClick={()=>setMenu(!menu)}><Menu size={18}/></button>
        <div className="min-w-0">
          <p className="display-title truncate text-sm">Good morning, Priya.</p>
          <p className="hidden text-[9px] font-bold uppercase tracking-widest text-[#2A3320]/50 sm:block">Ward operations console</p>
        </div>
        <div className="ml-auto hidden max-w-xs flex-1 items-center gap-2 border-2 border-[#2A3320] bg-white px-3 py-2 md:flex">
          <Search size={14}/>
          <input aria-label="Search issues" value={search} onChange={event=>setSearch(event.target.value)} onKeyDown={handleSearch} placeholder="Search issues or IDs…" className="w-full border-0 bg-transparent text-xs outline-none"/>
        </div>
        <Link to="/citizen" className="hidden border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider sm:block">Citizen view</Link>
        <Link to="/citizen/notifications" aria-label="Notifications" className="ml-auto flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-[#FDFBF7] md:ml-0"><Bell size={18}/></Link>
      </header>
      <div className="border-b-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-2.5 md:hidden">
        <label className="flex min-h-[44px] items-center gap-2 border-2 border-[#2A3320] bg-white px-3">
          <Search size={16}/>
          <input aria-label="Search issues on mobile" value={search} onChange={event=>setSearch(event.target.value)} onKeyDown={handleSearch} placeholder="Search issue ID (e.g. ND-104)…" className="w-full border-0 bg-transparent text-xs outline-none"/>
        </label>
      </div>
      <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-9"><Outlet/><p className="mt-9 border-t-2 border-[#D8C9A8] pt-4 text-xs font-bold uppercase tracking-wider text-[#2A3320]/55 sm:text-[9px]">Demo console · Synthetic records · <ShieldCheck className="inline" size={12}/> privacy-coarsened location</p></main>
    </div>
  </div>;
}
