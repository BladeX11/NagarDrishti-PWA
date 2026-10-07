import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CitizenLayout } from './layouts/CitizenLayout';
import { OfficerLayout } from './layouts/OfficerLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { ResearchLayout } from './layouts/ResearchLayout';
import { useIsMobile } from './hooks/useIsMobile';

const HeroLanding=lazy(()=>import('./pages/HeroLanding'));
const CitizenHome=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.CitizenHome})));
const ExploreMap=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.ExploreMap})));
const ReportFlow=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.ReportFlow})));
const MyReports=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.MyReports})));
const CitizenIssueDetail=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.CitizenIssueDetail})));
const VerificationVote=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.VerificationVote})));
const Notifications=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.Notifications})));
const Settings=lazy(()=>import('./pages/citizen/CitizenPages').then(m=>({default:m.Settings})));
const OfficerOverview=lazy(()=>import('./pages/officer/OfficerPages').then(m=>({default:m.OfficerOverview})));
const TriageQueue=lazy(()=>import('./pages/officer/OfficerPages').then(m=>({default:m.TriageQueue})));
const OfficerIssueDetail=lazy(()=>import('./pages/officer/OfficerPages').then(m=>({default:m.OfficerIssueDetail})));
const ProofReview=lazy(()=>import('./pages/officer/OfficerPages').then(m=>({default:m.ProofReview})));
const PublicMap=lazy(()=>import('./pages/transparency/PublicPages').then(m=>({default:m.PublicMap})));
const Scorecards=lazy(()=>import('./pages/transparency/PublicPages').then(m=>({default:m.Scorecards})));
const SLABreachWall=lazy(()=>import('./pages/transparency/PublicPages').then(m=>({default:m.SLABreachWall})));
const ForgottenIssues=lazy(()=>import('./pages/transparency/PublicPages').then(m=>({default:m.ForgottenIssues})));
const PublicIssueDetail=lazy(()=>import('./pages/transparency/PublicPages').then(m=>({default:m.PublicIssueDetail})));
const ResearchOverview=lazy(()=>import('./pages/research/ResearchPages').then(m=>({default:m.ResearchOverview})));
const AnnotationWorkspace=lazy(()=>import('./pages/research/AnnotationWorkspace').then(m=>({default:m.AnnotationWorkspace})));
const ModelPredictions=lazy(()=>import('./pages/research/ResearchPages').then(m=>({default:m.ModelPredictions})));
const DuplicateAnalysis=lazy(()=>import('./pages/research/ResearchPages').then(m=>({default:m.DuplicateAnalysis})));
const ProofAudit=lazy(()=>import('./pages/research/ResearchPages').then(m=>({default:m.ProofAudit})));
const ExperimentMetrics=lazy(()=>import('./pages/research/ResearchPages').then(m=>({default:m.ExperimentMetrics})));
const LiveEvaluationMetrics=lazy(()=>import('./pages/research/EvaluationMetrics').then(m=>({default:m.EvaluationMetrics})));
const AuditLedger=lazy(()=>import('./pages/research/ResearchPages').then(m=>({default:m.AuditLedger})));

function Loading(){return <div className="flex min-h-[50vh] items-center justify-center bg-[#F5EFE3] text-[#2A3320]"><span className="border-4 border-[#2A3320] bg-[#D8C9A8] px-5 py-4 text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#2A3320]">Opening dashboard…</span></div>}
function NotFound(){return <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5EFE3] px-5 text-center"><p className="eyebrow">404 · wrong turn</p><h1 className="display-title mt-3 text-4xl">This page isn't on the map.</h1><p className="mt-3 text-sm text-[#2A3320]/60">Choose a dashboard below and keep exploring.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link to="/" className="border-2 border-[#2A3320] bg-[#4F5B2A] px-4 py-3 text-[10px] font-black uppercase text-white">Home</Link><Link to="/transparency" className="border-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-3 text-[10px] font-black uppercase">Public map</Link></div></div>}

/**
 * ResponsiveHome — landing page gate.
 * Mobile visitors (< 1024px) go straight to the citizen portal.
 * Desktop visitors see the marketing hero page.
 */
function ResponsiveHome() {
  const isMobile = useIsMobile();
  if (isMobile) return <Navigate to="/citizen" replace />;
  return <HeroLanding />;
}

export default function App() {
  return <BrowserRouter><Toaster position="bottom-right" toastOptions={{style:{border:'2px solid #2A3320',borderRadius:0,background:'#FDFBF7',color:'#2A3320',fontFamily:'Outfit'}}}/><Suspense fallback={<Loading/>}><Routes>
  <Route path="/" element={<ResponsiveHome/>}/>
  <Route path="/citizen" element={<CitizenLayout/>}><Route index element={<CitizenHome/>}/><Route path="explore" element={<ExploreMap/>}/><Route path="report" element={<ReportFlow/>}/><Route path="my-reports" element={<MyReports/>}/><Route path="issue/:id/verify" element={<VerificationVote/>}/><Route path="issue/:id" element={<CitizenIssueDetail/>}/><Route path="notifications" element={<Notifications/>}/><Route path="settings" element={<Settings/>}/></Route>
  <Route path="/officer" element={<OfficerLayout/>}><Route index element={<OfficerOverview/>}/><Route path="queue" element={<TriageQueue/>}/><Route path="issue/:id/proof" element={<ProofReview/>}/><Route path="issue/:id" element={<OfficerIssueDetail/>}/></Route>
  <Route path="/transparency" element={<PublicLayout/>}><Route index element={<PublicMap/>}/><Route path="scorecards" element={<Scorecards/>}/><Route path="sla-breaches" element={<SLABreachWall/>}/><Route path="forgotten" element={<ForgottenIssues/>}/><Route path="issue/:id" element={<PublicIssueDetail/>}/></Route>
  <Route path="/research" element={<ResearchLayout/>}><Route index element={<ResearchOverview/>}/><Route path="annotation" element={<AnnotationWorkspace/>}/><Route path="models" element={<ModelPredictions/>}/><Route path="duplicates" element={<DuplicateAnalysis/>}/><Route path="proof-audit" element={<ProofAudit/>}/><Route path="metrics" element={<LiveEvaluationMetrics/>}/><Route path="audit-ledger" element={<AuditLedger/>}/></Route>
  <Route path="/dashboard" element={<Navigate to="/citizen" replace/>}/><Route path="*" element={<NotFound/>}/>
</Routes></Suspense></BrowserRouter>;
}
