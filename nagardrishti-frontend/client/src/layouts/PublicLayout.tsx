import { Link, NavLink, Outlet } from 'react-router-dom';
const tabs=[{to:'/transparency',label:'Issue map',end:true},{to:'/transparency/scorecards',label:'Scorecards'},{to:'/transparency/sla-breaches',label:'SLA breaches'},{to:'/transparency/forgotten',label:'Forgotten issues'}];
export function PublicLayout(){return <div className="min-h-screen bg-[#F5EFE3] text-[#2A3320]">
  <header className="sticky top-0 z-40 border-b-4 border-[#2A3320] bg-[#F5EFE3]">
    <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <Link to="/" className="flex shrink-0 items-center gap-2"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#B8892D]"/><i className="h-2.5 w-2.5 bg-[#4F5B2A]"/><i className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-[#2A3320]"/></span><b className="display-title text-sm">NagarDrishti</b></Link>
      <nav className="hidden items-center gap-5 lg:flex">{tabs.map(tab=><NavLink key={tab.to} to={tab.to} end={tab.end} className={({isActive})=>`border-b-4 py-4 text-[10px] font-black uppercase tracking-wider ${isActive?'border-[#B8892D] text-[#2A3320]':'border-transparent text-[#2A3320]/60 hover:text-[#2A3320]'}`}>{tab.label}</NavLink>)}</nav>
      <div className="flex shrink-0 gap-2"><Link to="/citizen" className="border-2 border-[#2A3320] bg-[#4F5B2A] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white">Citizen demo</Link><Link to="/" className="hidden border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase tracking-wider sm:block">← Home</Link></div>
    </div>
    <nav className="flex gap-4 overflow-x-auto border-t-2 border-[#D8C9A8] px-4 lg:hidden">{tabs.map(tab=><NavLink key={tab.to} to={tab.to} end={tab.end} className={({isActive})=>`shrink-0 border-b-4 py-3 text-[9px] font-black uppercase tracking-wider ${isActive?'border-[#B8892D]':'border-transparent text-[#2A3320]/60'}`}>{tab.label}</NavLink>)}</nav>
  </header>
  <main className="min-h-[calc(100vh-190px)]"><Outlet/></main>
  <footer className="border-t-4 border-[#2A3320] bg-[#2A3320] px-4 py-7 text-white sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="display-title text-sm">NagarDrishti</p><p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/55">Civic information, made visible.</p></div><p className="text-[9px] font-bold uppercase tracking-wider text-white/60">Public pins are coarsened · Demo data · Pune, India</p><Link to="/research" className="text-[9px] font-black uppercase tracking-widest text-[#D8C9A8] hover:underline">CivicLens research ↗</Link></div></footer>
</div>}
