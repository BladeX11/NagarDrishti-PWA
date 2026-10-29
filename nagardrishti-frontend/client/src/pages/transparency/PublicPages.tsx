import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, AlertTriangle, ArrowUpRight, Building2, CalendarClock, Clock3, Eye, MapPin, ShieldCheck, Users } from 'lucide-react';
import { issues as seedIssues, scorecards, statusEvents, weeklyMetrics } from '../../data/seed';
import { mapApi, transparencyApi, auditApi, type MapMarker, type ChainVerificationResult, type ApiIssue, TIER_COLORS, TIER_LABELS } from '../../lib/api';
import { loadSubmittedIssues } from '../../data/localDemo';
import type { Issue, ScorecardSnapshot } from '../../types';
import { FilterBar } from '../../components/shared/FilterBar';
import { IssueCard } from '../../components/shared/IssueCard';
import { MapView } from '../../components/shared/MapView';
import { PageHeader, Panel } from '../../components/shared/Primitives';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { StatusBadge } from '../../components/shared/StatusBadge';

const tip={contentStyle:{backgroundColor:'#2A3320',border:0,borderRadius:0,color:'#fff',fontSize:10},itemStyle:{color:'#fff'}};

export function PublicMap(){
  const [filter,setFilter]=useState({ward:'All',category:'All',status:'All'});const [selected,setSelected]=useState<any>(null); const [mapIssues,setMapIssues]=useState<MapMarker[]>([]); const [loaded,setLoaded]=useState(false);
  const [neglectZones,setNeglectZones]=useState<string[]>([]);
  const [cascades,setCascades]=useState<import('@shared/types').CascadeAlert[]>([]);
  const [submittedIssues]=useState(loadSubmittedIssues);
  
  useEffect(()=>{
    mapApi.getMarkers().then(data=>{setMapIssues(data);setLoaded(true);}).catch(()=>setLoaded(true));
    transparencyApi.getNeglectZones().then(d=>setNeglectZones(d.wardIds)).catch(()=>{});
    transparencyApi.getCascades().then(d=>setCascades(d)).catch(()=>{});
  },[]);
  const allIssues=mapIssues.length>0?mapIssues:[...seedIssues,...submittedIssues]; const filtered=useMemo(()=>(allIssues as any[]).filter(issue=>(filter.ward==='All'||issue.wardId===filter.ward||issue.ward===filter.ward)&&(filter.category==='All'||issue.category===filter.category)&&(filter.status==='All'||issue.status===filter.status)),[filter,allIssues]);
  const metrics=[[''+allIssues.filter((i:any)=>i.status==='Open').length,'Open'],[''+allIssues.filter((i:any)=>i.status==='In Progress'||i.status==='Assigned').length,'In progress'],[''+allIssues.filter((i:any)=>i.status==='Verified Fixed').length,'Resolved'],[''+allIssues.filter((i:any)=>i.status==='Reopened').length,'Reopened']];
  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><PageHeader eyebrow="Public information · No login required" title="Public issue map — Pune" description="Privacy-coarsened locations. Explore issue status and service patterns across Pune." action={<span className="flex items-center gap-2 border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider"><ShieldCheck size={13}/>Redacted public view</span>}/>
    <div className="mb-4 border-2 border-[#2A3320] bg-[#FDFBF7] p-3"><FilterBar filters={[{key:'ward',label:'Ward',options:['All','Ward 11','Ward 12','Ward 14','Ward 15']},{key:'category',label:'Category',options:['All','pothole/road','garbage/waste','drainage/sewage','water supply','streetlight/electrical','stray animals','encroachment','other']},{key:'status',label:'Status',options:['All','Open','Triaged','Assigned','In Progress','Claimed Resolved','Verified Fixed','Reopened']}]} onFilterChange={(key,value)=>setFilter(old=>({...old,[key]:value}))}/></div>
    <div className="relative"><MapView issues={filtered} selectedId={selected?.id} onSelectIssue={setSelected} height="min(67vh, 760px)" publicView neglectZoneWards={neglectZones} cascadeAlerts={cascades}/><div className="absolute right-3 top-3 z-[500] hidden w-40 border-4 border-[#2A3320] bg-[#FDFBF7] shadow-[4px_4px_0px_0px_#2A3320] sm:block">{metrics.map(([value,label])=><div key={label} className="flex justify-between border-b-2 border-[#E8E0D0] px-3 py-2.5 last:border-0"><span className="display-title text-xl">{value}</span><span className="self-center text-[9px] font-black uppercase tracking-wider">{label}</span></div>)}
    {neglectZones.length>0&&<div className="border-t-2 border-[#2A3320] bg-[#8B0000]/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#8B0000]"><AlertTriangle size={12} className="inline mr-1"/>{neglectZones.length} Neglect Zone{neglectZones.length>1?'s':''}</div>}
    {cascades.length>0&&<div className="border-t-2 border-[#2A3320] bg-[#B8892D]/15 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#B8892D]"><AlertTriangle size={12} className="inline mr-1"/>{cascades.length} Cascade Zone{cascades.length>1?'s':''}</div>}
    </div></div>
    {cascades.length>0&&(
      <div className="mt-6 border-4 border-[#2A3320] bg-[#FDFBF7] p-5 shadow-[4px_4px_0px_0px_#2A3320]">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Novelty Feature N4 · Infrastructure Diagnostics</p>
          <span className="border-2 border-[#2A3320] bg-[#D8C9A8] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">{cascades.length} Active Cascade{cascades.length>1?'s':''}</span>
        </div>
        <h3 className="display-title text-xl">Cross-Category Cascade Alert Zones</h3>
        <p className="mt-1 text-xs text-[#2A3320]/65">Spatiotemporally clustered civic complaints of multiple categories that point to an underlying infrastructure failure.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {cascades.map(c=>(
            <div key={c.id} className="border-2 border-[#2A3320] bg-[#D8C9A8]/20 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#B8892D]">Cluster · {c.confidence.toUpperCase()} Confidence</span>
                <span className="border border-[#2A3320] bg-white px-2 py-0.5 text-[8px] font-black uppercase">{c.wardId || 'Pune'}</span>
              </div>
              <h4 className="display-title mt-2 text-base">{c.suggestedRootCause}</h4>
              <p className="mt-1 text-xs text-[#2A3320]/75">{c.issueIds.length} connected complaints within {c.radiusMeters}m radius</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.categories.map(cat=><span key={cat} className="border border-[#2A3320] bg-white px-2 py-0.5 text-[9px] font-bold">{cat}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
    <div className="mt-5 flex flex-col justify-between gap-2 border-t-2 border-[#D8C9A8] pt-4 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/55 sm:flex-row"><span>⌖ All locations are coarsened. No personal data is displayed.</span><span>Data is synthetic and shown for demonstration purposes.</span></div>{selected&&<div className="fixed inset-x-3 bottom-4 z-[600] mx-auto max-w-lg border-4 border-[#2A3320] bg-[#FDFBF7] p-4 shadow-[6px_6px_0px_0px_#2A3320]"><div className="mb-2 flex justify-between"><p className="eyebrow">Approximate issue preview</p><button onClick={()=>setSelected(null)} className="text-xs font-black">CLOSE ×</button></div><IssueCard issue={selected} variant="compact" publicView/><Link to={`/transparency/issue/${selected.id}`} className="mt-3 block text-[9px] font-black uppercase tracking-wider text-[#4F5B2A] underline">View redacted issue →</Link></div>}</div>;
}

export function Scorecards(){
  const [view,setView]=useState<'ward'|'department'>('ward'); const [apiScorecard,setApiScorecard]=useState<any>(null); useEffect(()=>{transparencyApi.getScorecard().then(d=>setApiScorecard(d)).catch(()=>{});},[]);
  const grouped=useMemo(()=>{const groups=new Map<string,ScorecardSnapshot[]>();scorecards.forEach(card=>{const key=view==='ward'?card.ward:card.department;groups.set(key,[...(groups.get(key)||[]),card]);});const result:Array<{name:string;items:ScorecardSnapshot[];total:number;resolved:number;active:number;sla:number;days:string;reopen:number}>=[];groups.forEach((rows,name)=>{const n=rows.length;result.push({name,items:rows,total:rows.reduce((sum:number,row:ScorecardSnapshot)=>sum+row.totalIssues,0),resolved:rows.reduce((sum:number,row:ScorecardSnapshot)=>sum+row.resolvedIssues,0),active:rows.reduce((sum:number,row:ScorecardSnapshot)=>sum+row.activeIssues,0),sla:Math.round(rows.reduce((sum:number,row:ScorecardSnapshot)=>sum+row.slaCompliance,0)/n),days:(rows.reduce((sum:number,row:ScorecardSnapshot)=>sum+row.medianResolutionDays,0)/n).toFixed(1),reopen:Math.round(rows.reduce((sum:number,row:ScorecardSnapshot)=>sum+row.reopenRate,0)/n)});});return result;},[view]);
  const trends=weeklyMetrics;
  return <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9"><PageHeader eyebrow="Public accountability" title="Ward & department scorecards" description="System-level performance signals. No individual officers are named."/>
    <div className="mb-6 flex gap-2">{(['ward','department'] as const).map(key=><button key={key} onClick={()=>setView(key)} className={`border-2 border-[#2A3320] px-4 py-3 text-[10px] font-black uppercase tracking-wider ${view===key?'bg-[#4F5B2A] text-white shadow-[4px_4px_0px_0px_#2A3320]':'bg-[#FDFBF7]'}`}>By {key}</button>)}</div>
    <div className="mb-9 grid gap-5 md:grid-cols-2">{grouped.map((item,index)=><Panel key={item.name} className="relative border-4"><span className={`absolute right-5 top-5 h-3 w-3 ${index%3===0?'rounded-full':index%3===1?'rotate-45':''} ${['bg-[#4F5B2A]','bg-[#B8892D]','bg-[#D8C9A8]'][index%3]}`}/><div className="flex items-center gap-2">{view==='ward'?<MapPin size={17}/>:<Building2 size={17}/>}<h2 className="display-title text-xl">{item.name}</h2></div><div className="mt-5 grid grid-cols-3 border-2 border-[#2A3320] bg-[#D8C9A8]/45">{[[`${item.sla}%`,'SLA met'],[`${item.days}d`,'Median resolve'],[`${item.reopen}%`,'Reopen rate']].map(([value,label])=><div key={label} className="border-r-2 border-[#2A3320] px-3 py-3 last:border-0"><p className="display-title text-2xl">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest">{label}</p></div>)}</div><div className="mt-4 flex items-center justify-between text-xs font-bold"><span>{item.active} active · {item.resolved} resolved</span><span className="text-[9px] text-[#2A3320]/50">30-day snapshot</span></div><div className="mt-4 h-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={trends.slice(index,index+6)}><Line type="monotone" dataKey="days" stroke={index%2?'#B8892D':'#4F5B2A'} strokeWidth={3} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><p className="text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/45">Resolution time trend · Snapshot v1.0 · Demo data</p></Panel>)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><Chart title="Issues filed over time" subtitle="12-week view" type="filed"/><Chart title="Resolution time trend" subtitle="Median resolution · days" type="days"/></div><div className="mt-6"><Chart title="Category distribution" subtitle="Reports filed and resolved by week" type="area"/></div></div>;
}
function Chart({title,subtitle,type}:{title:string;subtitle:string;type:'filed'|'days'|'area'}){return <Panel className="chart-panel border-4"><div className="mb-4"><p className="eyebrow">Public trend</p><h3 className="display-title mt-1 text-lg">{title}</h3><p className="mt-1 text-[10px] text-[#2A3320]/55">{subtitle}</p></div><ResponsiveContainer width="100%" height={270}>{type==='area'?<AreaChart data={weeklyMetrics}><CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4"/><XAxis dataKey="week" tick={{fontSize:9,fontWeight:700}}/><YAxis tick={{fontSize:9,fontWeight:700}}/><Tooltip {...tip}/><Area dataKey="filed" name="Roads" stackId="1" stroke="#4F5B2A" fill="#4F5B2A" fillOpacity={.65} isAnimationActive={false}/><Area dataKey="resolved" name="Waste" stackId="1" stroke="#B8892D" fill="#B8892D" fillOpacity={.65} isAnimationActive={false}/></AreaChart>:type==='filed'?<LineChart data={weeklyMetrics}><CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4"/><XAxis dataKey="week" tick={{fontSize:9,fontWeight:700}}/><YAxis tick={{fontSize:9,fontWeight:700}}/><Tooltip {...tip}/><Line dataKey="filed" name="Filed" stroke="#4F5B2A" strokeWidth={3} dot={{r:3,fill:'#4F5B2A'}} isAnimationActive={false}/><Line dataKey="resolved" name="Resolved" stroke="#B8892D" strokeWidth={3} dot={{r:3,fill:'#B8892D'}} isAnimationActive={false}/></LineChart>:<LineChart data={weeklyMetrics}><CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4"/><XAxis dataKey="week" tick={{fontSize:9,fontWeight:700}}/><YAxis tick={{fontSize:9,fontWeight:700}}/><Tooltip {...tip}/><Line dataKey="days" name="Median days" stroke="#4F5B2A" strokeWidth={3} dot={{r:3,fill:'#4F5B2A'}} isAnimationActive={false}/></LineChart>}</ResponsiveContainer></Panel>}

export function SLABreachWall(){
  const [sort,setSort]=useState('Most overdue');const [items,setItems]=useState<ApiIssue[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{transparencyApi.getSLABreaches().then(d=>{setItems(d);setLoading(false)}).catch(()=>setLoading(false));},[]);
  const ordered=[...items].sort((a,b)=>{
    const aOverdue = Math.max(1, Math.floor((Date.now() - new Date(a.slaDeadline!).getTime()) / 86400000));
    const bOverdue = Math.max(1, Math.floor((Date.now() - new Date(b.slaDeadline!).getTime()) / 86400000));
    if(sort==='Most supporters') return b.supporterCount-a.supporterCount;
    if(sort==='Newest') return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
    return bOverdue - aOverdue;
  });
  return <div className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8"><section className="-mx-4 mb-7 border-b-4 border-[#2A3320] bg-[#B8892D] px-5 py-8 sm:-mx-6 sm:px-8 lg:-mx-8 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[.2em]">Public accountability · Pune</p><h1 className="display-title mt-2 text-3xl md:text-4xl">SLA breach wall</h1><p className="mt-3 max-w-2xl text-sm">Issues that have exceeded their service-level deadline. No personal data. Department and ward accountability only.</p></section><div className="mb-5 flex flex-wrap items-center gap-2">{['Most overdue','Most supporters','Newest'].map(name=><button key={name} onClick={()=>setSort(name)} className={`border-2 border-[#2A3320] px-3 py-2 text-[9px] font-black uppercase tracking-wider ${sort===name?'bg-[#4F5B2A] text-white':'bg-[#FDFBF7]'}`}>{name}</button>)}</div>
    {loading?<div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-20 bg-[#D8C9A8] rounded"></div><div className="h-20 bg-[#D8C9A8] rounded"></div></div></div>:
    ordered.length?<div className="grid gap-5 md:grid-cols-2">{ordered.map(issue=>{const overdue=Math.max(1, Math.floor((Date.now() - new Date(issue.slaDeadline!).getTime()) / 86400000));return <article key={issue.id} className="border-4 border-l-8 border-[#2A3320] border-l-[#B8892D] bg-[#FDFBF7] p-5 shadow-[6px_6px_0px_0px_#2A3320]"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#B8892D]"><AlertTriangle size={16}/>{overdue} days overdue</p><h2 className="display-title mt-4 text-xl">{issue.title}</h2><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">{issue.category} · {issue.wardId} · {issue.departmentId}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold"><span>{issue.supporterCount} supporters</span><span>Filed {new Date(issue.createdAt).toLocaleDateString()}</span><StatusBadge status={issue.status as any}/></div><p className="mt-4 border-t-2 border-[#E8E0D0] pt-3 text-xs">Exceeded by <b>{overdue} days</b></p><Link to={`/transparency/issue/${issue.id}`} className="mt-4 inline-flex text-[9px] font-black uppercase tracking-widest text-[#4F5B2A] underline">View issue →</Link></article>})}</div>:<Panel className="border-4 text-center"><CheckIcon/><h2 className="display-title mt-4 text-xl">No SLA breaches currently</h2><p className="mt-2 text-sm text-[#2A3320]/60">All issues are within their service deadline.</p></Panel>}</div>;
}
function CheckIcon(){return <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#2A3320] bg-[#4F5B2A] text-xl text-white">✓</span>}

export function ForgottenIssues(){
  const [list,setList]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{transparencyApi.getForgottenIssues().then(d=>{setList(d);setLoading(false)}).catch(()=>setLoading(false));},[]);
  return <div className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8"><section className="-mx-4 mb-8 border-b-4 border-[#2A3320] bg-[#4F5B2A] px-5 py-8 text-white sm:-mx-6 sm:px-8 lg:-mx-8 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#D8C9A8]">Public accountability · Pune</p><h1 className="display-title mt-2 text-3xl">Forgotten issues</h1><p className="mt-3 max-w-2xl text-sm text-white/80">Issues ranked by inaction tier, age, and community support.</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#D8C9A8]">A prioritisation aid, not a legal ranking.</p></section>
  {loading?<div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-16 bg-[#D8C9A8] rounded"></div><div className="h-16 bg-[#D8C9A8] rounded"></div></div></div>:
  <div className="space-y-4">{list.map((issue,index)=><article key={issue.id} className={`grid grid-cols-[56px_1fr] gap-4 border-4 border-[#2A3320] bg-[#FDFBF7] p-4 shadow-[5px_5px_0px_0px_#2A3320] sm:grid-cols-[76px_1fr] sm:gap-6 sm:p-5 ${issue.tier===4?'animate-[pulse-stroke_1.8s_ease-in-out_infinite]':''}`}><div className="flex items-center justify-center"><div className="flex h-12 w-12 rotate-45 items-center justify-center border-2 border-[#2A3320] bg-[#4F5B2A] text-white sm:h-14 sm:w-14" style={{ backgroundColor: issue.tier !== undefined ? TIER_COLORS[issue.tier as number] : '#4F5B2A' }}><span className="-rotate-45 display-title text-lg">#{index+1}</span></div></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="eyebrow" style={{ color: issue.tier !== undefined ? TIER_COLORS[issue.tier as number] : undefined }}>T{issue.tier ?? 0} · {issue.inactionDays ?? 0}d</span><StatusBadge status={issue.status}/></div><h2 className="display-title mt-2 text-lg sm:text-xl">{issue.title}</h2><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/55">{issue.category} · {issue.wardId} · {new Date(issue.createdAt).toLocaleDateString()}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#2A3320]/70"><span>{issue.supporterCount ?? 0} supporters</span><span>{issue.assignedTo?'Assigned for review':'Never assigned'}</span><span>{issue.departmentId}</span></div><Link to={`/transparency/issue/${issue.id}`} className="mt-3 inline-flex text-[9px] font-black uppercase tracking-wider text-[#4F5B2A] underline">View issue →</Link></div></article>)}</div>}</div>;
}

export function PublicIssueDetail(){
  const {id='ND-104'}=useParams();const issue=seedIssues.find(item=>item.id===id)||loadSubmittedIssues().find(item=>item.id===id)||seedIssues[0];const events=statusEvents.filter(event=>event.issueId===issue.id);
  const [chain,setChain]=useState<ChainVerificationResult|null>(null);const [chainLoading,setChainLoading]=useState(true);
  useEffect(()=>{setChainLoading(true);auditApi.verifyIssue(id).then(d=>{setChain(d);setChainLoading(false);}).catch(()=>setChainLoading(false));},[id]);
  return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8"><div className="mb-5 border-4 border-[#2A3320] bg-[#D8C9A8]/40 p-4"><div className="flex items-center gap-2"><Eye size={16}/><p className="text-[10px] font-black uppercase tracking-widest">You are viewing a public, redacted view of this issue.</p></div><p className="mt-1 text-xs text-[#2A3320]/65">Reporter identity and exact coordinates are not shown.</p></div><Link to="/transparency" className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#4F5B2A] hover:underline">← Back to public map</Link><div className="border-b-4 border-[#2A3320] pb-5"><div className="mb-3 flex flex-wrap items-center gap-3"><span className="eyebrow">{issue.category}</span><StatusBadge status={issue.status as any}/></div><h1 className="display-title text-2xl md:text-4xl">{issue.title}</h1><p className="mt-3 text-xs font-medium text-[#2A3320]/60">Issue {issue.id} · {issue.age} · {issue.ward} · {issue.supporters} supporters · {issue.department}</p></div><div className="mt-6 grid gap-7 md:grid-cols-[1.05fr_.95fr]"><div className="space-y-6"><section><p className="eyebrow mb-3">Approximate location</p><MapView issues={[issue]} selectedId={issue.id} height="260px" publicView/></section><section><p className="eyebrow mb-3">Public description</p><Panel className="border-4"><p className="text-sm leading-relaxed">{issue.description}</p><p className="mt-3 border-t-2 border-[#E8E0D0] pt-3 text-[9px] font-black uppercase tracking-wider text-[#2A3320]/55">Public preview · redacted derivative</p></Panel></section><Panel className="border-4 !p-0"><div className="flex h-44 items-center justify-center bg-[#D8C9A8]/40"><MapPin size={42}/></div><p className="border-t-4 border-[#2A3320] bg-[#FDFBF7] px-4 py-3 text-[9px] font-black uppercase tracking-widest">Public preview · personal data removed</p></Panel></div><div className="space-y-6"><section><p className="eyebrow mb-3">Public activity · names withheld</p><Panel className="border-4"><ActivityTimeline events={events} redacted/></Panel></section>
    <section><p className="eyebrow mb-3">Audit chain verification</p>{chainLoading?<Panel className="border-4 animate-pulse"><div className="h-4 w-32 bg-[#D8C9A8] rounded"/><div className="mt-2 h-3 w-48 bg-[#D8C9A8] rounded"/></Panel>:chain?<Panel className={`border-4 ${chain.chainValid?'border-[#4F5B2A] bg-[#4F5B2A]/10':'border-red-500 bg-red-50'}`}><div className="flex items-center gap-2"><ShieldCheck size={18} className={chain.chainValid?'text-[#4F5B2A]':'text-red-500'}/><p className="font-black text-sm">{chain.chainValid?'Chain intact — no tampering detected':'CHAIN BROKEN — possible tampering'}</p></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="eyebrow">Events verified</p><p className="mt-1 font-black text-lg">{chain.eventCount}</p></div><div><p className="eyebrow">Latest hash</p><p className="mt-1 font-mono text-[10px] break-all text-[#2A3320]/70">{chain.latestHash?chain.latestHash.slice(0,16)+'...':'—'}</p></div></div>{chain.brokenAt&&<p className="mt-2 text-[10px] text-red-600 font-bold">Broken at event: {chain.brokenAt}</p>}<p className="mt-3 border-t-2 border-[#E8E0D0] pt-2 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/45">Checked {new Date(chain.checkedAt).toLocaleTimeString()}</p></Panel>:<Panel className="border-4"><p className="text-xs text-[#2A3320]/60">Chain data unavailable — issue not yet in database.</p></Panel>}</section>
    {issue.status==='Claimed Resolved'&&<Panel className="border-4 border-[#B8892D] bg-[#B8892D]/10"><p className="display-title text-sm">Have a registered account?</p><p className="mt-2 text-xs leading-relaxed text-[#2A3320]/65">Sign in to help verify whether this claimed fix is complete.</p><Link to={`/citizen/issue/${issue.id}/verify`} className="mt-4 inline-flex text-[9px] font-black uppercase text-[#4F5B2A] underline">Login to vote →</Link></Panel>}<Panel className="border-4 bg-[#D8C9A8]/30"><p className="eyebrow">Privacy promise</p><p className="mt-2 text-xs leading-relaxed">No reporter name, exact coordinates, or original photo metadata is available in this public view.</p></Panel></div></div></div>;
}

// ── Ward Equity Dashboard (N1) ────────────────────────────────────────────────

export function EquityDashboard() {
  const [data, setData] = useState<import('@shared/types').EquityAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    transparencyApi.getEquity()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const planned = data?.overallByWardType?.planned;
  const unplanned = data?.overallByWardType?.unplanned;
  const mixed = data?.overallByWardType?.mixed;
  const periUrban = data?.overallByWardType?.['peri-urban'];

  const plannedMedian = planned?.medianResponseDays ?? 0;
  const unplannedMedian = unplanned?.medianResponseDays ?? 0;
  const overallGapDays = Math.round((unplannedMedian - plannedMedian) * 10) / 10;
  const overallDisparity = plannedMedian > 0 ? (unplannedMedian / plannedMedian).toFixed(1) : '1.0';

  // Format data for Gap Chart (Planned vs Unplanned per Category)
  const gapChartData = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.map((cat) => ({
      category: cat.category,
      shortName: cat.category.split('/')[0],
      planned: cat.gap.plannedMedianResponse,
      unplanned: cat.gap.unplannedMedianResponse,
      gap: cat.gap.gapDays,
      ratio: cat.gap.disparityRatio,
      significant: cat.statisticalTest.significant,
    }));
  }, [data]);

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    if (selectedCategory === 'All') return data.categories;
    return data.categories.filter((c) => c.category === selectedCategory);
  }, [data, selectedCategory]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <PageHeader
        eyebrow="Novelty Feature N1 · Public Accountability"
        title="Ward Equity Analysis"
        description="Measuring whether municipal service quality is distributed fairly across socioeconomic ward types."
        action={
          <span className="flex items-center gap-2 border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[9px] font-black uppercase tracking-wider">
            <ShieldCheck size={13} />
            Statistical Bias Audit
          </span>
        }
      />

      {/* Fairness Alert Banners */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {data.alerts.map((alert) => (
            <div
              key={alert.category}
              className={`flex items-start gap-3 border-4 border-[#2A3320] p-4 shadow-[4px_4px_0px_0px_#2A3320] ${
                alert.severity === 'high'
                  ? 'bg-[#8B0000]/10 border-l-[12px] border-l-[#8B0000]'
                  : 'bg-[#B8892D]/15 border-l-[12px] border-l-[#B8892D]'
              }`}
            >
              <AlertTriangle
                size={20}
                className={alert.severity === 'high' ? 'text-[#8B0000] shrink-0 mt-0.5' : 'text-[#B8892D] shrink-0 mt-0.5'}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2A3320]/70">
                  Fairness Alert · {alert.severity.toUpperCase()} Disparity
                </p>
                <p className="mt-1 text-sm font-bold text-[#2A3320]">{alert.message}</p>
              </div>
              <span className="shrink-0 border-2 border-[#2A3320] bg-[#FDFBF7] px-2.5 py-1 text-[10px] font-black">
                {alert.disparityRatio}x GAP
              </span>
            </div>
          ))}
        </div>
      )}

      {/* High-level City Equity Stats */}
      <div className="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="border-4 bg-[#FDFBF7]">
          <p className="eyebrow">Planned Wards (Benchmark)</p>
          <h3 className="display-title mt-2 text-3xl text-[#4F5B2A]">{plannedMedian}d</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
            Median Response Time · {planned?.totalIssues ?? 0} issues
          </p>
          <div className="mt-3 border-t-2 border-[#E8E0D0] pt-2 text-xs">
            <span>SLA Met: <b>{planned?.slaComplianceRate ?? 0}%</b></span>
            <span className="mx-2">·</span>
            <span>Reopen: <b>{planned?.reopenRate ?? 0}%</b></span>
          </div>
        </Panel>

        <Panel className="border-4 bg-[#FDFBF7]">
          <p className="eyebrow">Unplanned Wards</p>
          <h3 className="display-title mt-2 text-3xl text-[#8B0000]">{unplannedMedian}d</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
            Median Response Time · {unplanned?.totalIssues ?? 0} issues
          </p>
          <div className="mt-3 border-t-2 border-[#E8E0D0] pt-2 text-xs">
            <span>SLA Met: <b>{unplanned?.slaComplianceRate ?? 0}%</b></span>
            <span className="mx-2">·</span>
            <span>Reopen: <b>{unplanned?.reopenRate ?? 0}%</b></span>
          </div>
        </Panel>

        <Panel className="border-4 bg-[#FDFBF7]">
          <p className="eyebrow">Equity Gap</p>
          <h3 className="display-title mt-2 text-3xl text-[#B8892D]">+{overallGapDays}d</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
            Additional wait for unplanned wards
          </p>
          <div className="mt-3 border-t-2 border-[#E8E0D0] pt-2 text-xs font-bold text-[#2A3320]">
            Disparity Ratio: <b>{overallDisparity}x</b>
          </div>
        </Panel>

        <Panel className="border-4 bg-[#FDFBF7]">
          <p className="eyebrow">Kruskal-Wallis Audit</p>
          <h3 className="display-title mt-2 text-xl">Non-Parametric</h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
            {data?.totalIssuesAnalyzed ?? 0} issues analyzed city-wide
          </p>
          <div className="mt-3 border-t-2 border-[#E8E0D0] pt-2 text-xs">
            <span className="font-bold">Controls:</span> Category & Priority
          </div>
        </Panel>
      </div>

      {/* Main Charts & Visualizations */}
      <div className="mb-9 grid gap-6 lg:grid-cols-2">
        {/* Gap Chart: Planned vs Unplanned response days */}
        <Panel className="border-4">
          <div className="mb-4">
            <p className="eyebrow">Gap Chart</p>
            <h3 className="display-title mt-1 text-xl">Planned vs Unplanned Response Times</h3>
            <p className="mt-1 text-[10px] text-[#2A3320]/60">
              Median days from report to initial action (Assigned/Triaged) by issue category.
            </p>
          </div>
          <div className="h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs font-bold">Loading chart data...</div>
            ) : gapChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 9, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700 }} label={{ value: 'Days', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip {...tip} />
                  <Bar dataKey="planned" name="Planned Wards" fill="#4F5B2A" />
                  <Bar dataKey="unplanned" name="Unplanned Wards" fill="#B8892D" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#2A3320]/60">No category gap data available yet.</div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t-2 border-[#E8E0D0] pt-2 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/60">
            <span>Green = Planned (Advantaged)</span>
            <span>Gold = Unplanned (Underserved)</span>
          </div>
        </Panel>

        {/* Equity Heatmap Matrix */}
        <Panel className="border-4">
          <div className="mb-4">
            <p className="eyebrow">Equity Heatmap</p>
            <h3 className="display-title mt-1 text-xl">Response Time Matrix (Days)</h3>
            <p className="mt-1 text-[10px] text-[#2A3320]/60">
              Cross-tabulation of ward socioeconomic type against civic categories.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#2A3320] bg-[#D8C9A8]/40 text-[9px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Planned</th>
                  <th className="py-2.5 px-3 text-center">Mixed</th>
                  <th className="py-2.5 px-3 text-center">Unplanned</th>
                  <th className="py-2.5 px-3 text-center">Peri-urban</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D0]">
                {data?.categories && data.categories.length > 0 ? (
                  data.categories.map((c) => {
                    const pVal = c.metricsByWardType.planned?.medianResponseDays ?? 0;
                    const mVal = c.metricsByWardType.mixed?.medianResponseDays ?? 0;
                    const uVal = c.metricsByWardType.unplanned?.medianResponseDays ?? 0;
                    const puVal = c.metricsByWardType['peri-urban']?.medianResponseDays ?? 0;

                    const getCellClass = (days: number) => {
                      if (days <= 1.5) return 'bg-[#4F5B2A]/15 text-[#4F5B2A] font-bold';
                      if (days <= 3.5) return 'bg-[#B8892D]/20 text-[#B8892D] font-bold';
                      return 'bg-[#8B0000]/15 text-[#8B0000] font-black';
                    };

                    return (
                      <tr key={c.category} className="hover:bg-[#FDFBF7]">
                        <td className="py-2.5 px-3 font-bold text-[#2A3320]">{c.category}</td>
                        <td className={`py-2.5 px-3 text-center ${getCellClass(pVal)}`}>{pVal > 0 ? `${pVal}d` : '—'}</td>
                        <td className={`py-2.5 px-3 text-center ${getCellClass(mVal)}`}>{mVal > 0 ? `${mVal}d` : '—'}</td>
                        <td className={`py-2.5 px-3 text-center ${getCellClass(uVal)}`}>{uVal > 0 ? `${uVal}d` : '—'}</td>
                        <td className={`py-2.5 px-3 text-center ${getCellClass(puVal)}`}>{puVal > 0 ? `${puVal}d` : '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#2A3320]/60">
                      No category metrics recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between border-t-2 border-[#E8E0D0] pt-2 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/60">
            <span>&lt;=1.5d Fast</span>
            <span>1.6-3.5d Moderate</span>
            <span>&gt;3.5d Delayed</span>
          </div>
        </Panel>
      </div>

      {/* Category Breakdown & Statistical Test Results */}
      <Panel className="border-4">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Category Breakdown & Hypothesis Testing</p>
            <h3 className="display-title mt-1 text-xl">Kruskal-Wallis Variance Analysis</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2A3320]/70">Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-1.5 text-xs font-bold"
            >
              <option value="All">All Categories</option>
              {data?.categories?.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredCategories.map((cat) => (
            <div key={cat.category} className="border-2 border-[#2A3320] bg-[#FDFBF7] p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h4 className="display-title text-base">{cat.category}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
                    Planned: {cat.gap.plannedMedianResponse}d · Unplanned: {cat.gap.unplannedMedianResponse}d · Gap: {cat.gap.gapDays}d ({cat.gap.disparityRatio}x)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`border-2 border-[#2A3320] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                      cat.statisticalTest.significant
                        ? 'bg-[#8B0000] text-white'
                        : 'bg-[#D8C9A8] text-[#2A3320]'
                    }`}
                  >
                    {cat.statisticalTest.significant ? 'p < 0.05 (Disparity Significant)' : 'No Significant Bias'}
                  </span>
                  {cat.statisticalTest.underservedWardType && (
                    <span className="border-2 border-[#2A3320] bg-[#FDFBF7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                      Underserved: {cat.statisticalTest.underservedWardType}
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-grid of ward types for this category */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['planned', 'mixed', 'unplanned', 'peri-urban'] as const).map((wt) => {
                  const m = cat.metricsByWardType[wt];
                  return (
                    <div key={wt} className="border border-[#2A3320]/30 bg-[#F5EFE3] p-2.5 text-xs">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#2A3320]/70">{wt}</p>
                      <p className="mt-1 font-black text-sm">{m ? `${m.medianResponseDays}d` : '—'}</p>
                      <p className="text-[9px] text-[#2A3320]/60">SLA: {m ? `${m.slaComplianceRate}%` : '—'}</p>
                      <p className="text-[9px] text-[#2A3320]/60">{m?.totalIssues ?? 0} issues</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}


