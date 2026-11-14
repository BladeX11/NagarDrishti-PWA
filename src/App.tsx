import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapView } from './components/MapView';
import { OfficerDashboard } from './components/OfficerDashboard';
import { ReportSheet } from './components/ReportSheet';
import { displayCategories } from './lib/categorySuggestion';
import { liveApi, type IssueEvent, type LiveIssue } from './lib/liveApi';

export type IssueStatus = 'Open' | 'Triaged' | 'Assigned' | 'In Progress' | 'Claimed Resolved' | 'Verified Fixed' | 'Reopened';
export type Issue = {
  id: string;
  publicRef: string;
  category: string;
  title: string;
  age: string;
  ageInDays: number;
  supporters: number;
  status: IssueStatus;
  department: string;
  ward: string;
  description: string;
  position: [number, number] | null;
  slaBreach: boolean;
  proofState: string;
};

const departmentNames: Record<string, string> = {
  'pothole/road': 'Roads', 'garbage/waste': 'Solid waste', 'drainage/sewage': 'Drainage',
  'water supply': 'Water', 'streetlight/electrical': 'Electrical', 'stray animals': 'Animal control',
  encroachment: 'Civic works', other: 'Civic works',
};

function toIssue(row: LiveIssue): Issue {
  const category = displayCategories.find((item) => item.value === row.category)?.label ?? row.category;
  return {
    id: row.id,
    publicRef: row.publicRef,
    category,
    title: row.title,
    age: row.age,
    ageInDays: row.ageInDays,
    supporters: row.supporterCount ?? 0,
    status: row.status as IssueStatus,
    department: departmentNames[row.category] ?? 'Civic works',
    ward: 'Pune area',
    description: row.description ?? '',
    position: typeof row.latitude === 'number' && typeof row.longitude === 'number' ? [row.latitude, row.longitude] : null,
    slaBreach: row.slaBreach,
    proofState: row.proofState ?? 'none',
  };
}

function App() {
  const [role, setRole] = useState<'citizen' | 'officer'>('citizen');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [supportedIds, setSupportedIds] = useState<Set<string>>(() => new Set());
  const [timeline, setTimeline] = useState<IssueEvent[]>([]);
  const [timelineIssueId, setTimelineIssueId] = useState('');
  const [timelineError, setTimelineError] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'scorecard'>('map');
  const selectedIssue = issues.find((issue) => issue.id === selectedId) ?? issues[0] ?? null;

  const refreshIssues = useCallback(async () => {
    setLoadingIssues(true);
    setLoadError('');
    try {
      const result = await liveApi.listIssues();
      const nextIssues = result.items.map(toIssue);
      setIssues(nextIssues);
      setSelectedId((current) => nextIssues.some((issue) => issue.id === current) ? current : nextIssues[0]?.id ?? '');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load reports from the server.');
    } finally {
      setLoadingIssues(false);
    }
  }, []);

  useEffect(() => { void refreshIssues(); }, [refreshIssues]);

  const activeCount = useMemo(() => issues.filter((issue) => !['Claimed Resolved', 'Verified Fixed'].includes(issue.status)).length, [issues]);
  const slaPercent = issues.length ? Math.round((issues.filter((issue) => !issue.slaBreach).length / issues.length) * 100) : 0;

  async function handleSupport(issue: Issue) {
    if (supportedIds.has(issue.id)) return;
    setBusy(true);
    setActionError('');
    try {
      await liveApi.supportIssue(issue.id);
      setSupportedIds((current) => new Set(current).add(issue.id));
      await refreshIssues();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not support this report.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTimeline(issue: Issue) {
    if (timelineIssueId === issue.id) {
      setTimelineIssueId('');
      return;
    }
    setTimelineLoading(true);
    setTimelineError('');
    setTimelineIssueId(issue.id);
    try {
      setTimeline(await liveApi.getTimeline(issue.id));
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : 'Could not load the report timeline.');
    } finally {
      setTimelineLoading(false);
    }
  }

  async function advanceIssue(issue: Issue) {
    setBusy(true);
    setActionError('');
    try {
      if (issue.status === 'Open') await liveApi.transitionIssue(issue.id, 'Triaged', 'Reviewed in mobile officer demo');
      else if (issue.status === 'Triaged') await liveApi.assignIssue(issue.id);
      else if (issue.status === 'Assigned' || issue.status === 'Reopened') await liveApi.transitionIssue(issue.id, 'In Progress', 'Work started in mobile officer demo');
      await refreshIssues();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this report.');
    } finally {
      setBusy(false);
    }
  }

  async function resolveIssue(issue: Issue, note: string) {
    setBusy(true);
    setActionError('');
    try {
      await liveApi.submitProof(issue.id, note);
      await liveApi.transitionIssue(issue.id, 'Claimed Resolved', note);
      await refreshIssues();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not submit the resolution note.');
    } finally {
      setBusy(false);
    }
  }

  async function reportCreated(_issue: LiveIssue) {
    await refreshIssues();
  }

  if (role === 'officer') return <>
    {actionError && <div className="global-message" role="alert">{actionError}</div>}
    <OfficerDashboard issues={issues} selectedIssue={selectedIssue} loading={loadingIssues} error={loadError} busy={busy} onRefresh={() => void refreshIssues()} onSelectIssue={(issue) => setSelectedId(issue.id)} onAdvance={advanceIssue} onResolve={resolveIssue} onSwitchRole={() => { setRole('citizen'); setActionError(''); }} />
  </>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark" aria-hidden="true">N</div><div><p className="eyebrow">Pune · citizen view</p><h1>NagarDrishti</h1></div><button className="role-switch" onClick={() => setRole('officer')}>Officer demo</button></header>
    <nav className="tab-bar" aria-label="Main navigation"><button className={activeTab === 'map' ? 'tab active' : 'tab'} onClick={() => setActiveTab('map')}>Explore</button><button className={activeTab === 'scorecard' ? 'tab active' : 'tab'} onClick={() => setActiveTab('scorecard')}>Ward snapshot</button></nav>
    {activeTab === 'map' ? <>
      <section className="intro-block"><div><p className="eyebrow">Make your neighbourhood visible</p><h2>What needs attention<br />around you?</h2></div><button className="refresh-button" type="button" onClick={() => void refreshIssues()} disabled={loadingIssues}>{loadingIssues ? 'Refreshing…' : 'Refresh reports'}</button></section>
      {loadError && <div className="global-message" role="alert">Can’t reach the report service: {loadError} <button type="button" onClick={() => void refreshIssues()}>Retry</button></div>}
      <section className="map-card" aria-label="Public issue map"><MapView issues={issues} selectedIssue={selectedIssue} onSelectIssue={(issue) => setSelectedId(issue.id)} /><div className="map-key"><span className="key-dot amber" /> Open <span className="key-dot green" /> In progress <span className="key-dot blue" /> Resolved</div></section>
      <section className="issue-panel"><div className="section-heading"><div><p className="eyebrow">Live from the report service</p><h3>Neighbourhood reports</h3></div><span className="count-badge">{issues.length} reports</span></div>
        {loadingIssues && issues.length === 0 ? <p className="empty-state">Loading reports…</p> : issues.length === 0 ? <p className="empty-state">No reports yet. Submit the first one for this demo area.</p> : <>
          <div className="nearby-list">{issues.slice(0, 12).map((issue) => <button key={issue.id} className={issue.id === selectedIssue?.id ? 'nearby-item selected' : 'nearby-item'} onClick={() => setSelectedId(issue.id)}><span className="category-label">{issue.category}</span><strong>{issue.title}</strong><small>{issue.publicRef} · {issue.status} · {issue.age}</small></button>)}</div>
          {selectedIssue && <article className="issue-card"><div className="issue-card-top"><span className="category-label">{selectedIssue.category}</span><span className={`status ${selectedIssue.status.toLowerCase().replaceAll(' ', '-')}`}>{selectedIssue.status}</span></div><h4>{selectedIssue.title}</h4><div className="issue-meta"><span>{selectedIssue.age}</span><span> · </span><span>{selectedIssue.supporters} neighbours support this</span></div><p className="issue-description">{selectedIssue.description}</p><div className="issue-actions"><button className="text-button" onClick={() => void handleTimeline(selectedIssue)}>{timelineIssueId === selectedIssue.id ? 'Hide timeline' : 'View timeline'} <span>↗</span></button><button className="support-button" onClick={() => void handleSupport(selectedIssue)} disabled={busy || supportedIds.has(selectedIssue.id)}>{supportedIds.has(selectedIssue.id) ? '✓ Supported' : busy ? 'Please wait…' : '＋ Support issue'}</button></div>
            {timelineIssueId === selectedIssue.id && <div className="issue-timeline">{timelineLoading ? 'Loading timeline…' : timelineError ? timelineError : timeline.length ? timeline.map((event) => <div key={event.id}><strong>{event.toStatus}</strong><small>{event.reason || event.actorRole} · {new Date(event.createdAt ?? event.timestamp ?? '').toLocaleString()}</small></div>) : 'No timeline events available yet.'}</div>}
          </article>}
        </>}
      </section>
      {actionError && <div className="global-message" role="alert">{actionError}</div>}
      <button className="report-button" onClick={() => setReportOpen(true)}><span>＋</span> Report an issue</button>
    </> : <section className="scorecard-panel"><p className="eyebrow">Pune · current report snapshot</p><h2>Small signals,<br />shared accountability.</h2><div className="scorecard-stat"><strong>{slaPercent}%</strong><span>active reports are<br />within their SLA</span></div><div className="scorecard-stat"><strong>{activeCount}</strong><span>reports still needing<br />city action</span></div><div className="scorecard-stat"><strong>{issues.length}</strong><span>reports loaded from<br />the shared database</span></div><p className="fine-print">Live values from the report service. No individual officers are ranked.</p><button className="refresh-button" onClick={() => void refreshIssues()} disabled={loadingIssues}>{loadingIssues ? 'Refreshing…' : 'Refresh snapshot'}</button></section>}
    <footer className="footer-note"><span>⌖</span> Public pins are coarsened. Report coordinates are private.</footer>
    {isReportOpen && <ReportSheet onClose={() => setReportOpen(false)} onCreated={reportCreated} />}
  </main>;
}

export default App;
