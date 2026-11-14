import { useEffect, useState } from 'react';
import type { Issue } from '../App';

type Props = {
  issues: Issue[];
  selectedIssue: Issue | null;
  loading: boolean;
  error: string;
  busy: boolean;
  onRefresh: () => void;
  onSelectIssue: (issue: Issue) => void;
  onAdvance: (issue: Issue) => void;
  onResolve: (issue: Issue, note: string) => void;
  onSwitchRole: () => void;
};

const statuses = ['All', 'Open', 'Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed', 'Reopened'] as const;

function nextAction(status: Issue['status']): string | null {
  if (status === 'Open') return 'Mark triaged';
  if (status === 'Triaged') return 'Assign to me';
  if (status === 'Assigned' || status === 'Reopened') return 'Start work';
  return null;
}

export function OfficerDashboard({ issues, selectedIssue, loading, error, busy, onRefresh, onSelectIssue, onAdvance, onResolve, onSwitchRole }: Props) {
  const [filter, setFilter] = useState<string>('All');
  const [resolutionNote, setResolutionNote] = useState('');
  const visibleIssues = filter === 'All' ? issues : issues.filter((issue) => issue.status === filter);
  const currentIssue = selectedIssue ?? visibleIssues[0] ?? null;

  useEffect(() => { setResolutionNote(''); }, [currentIssue?.id]);

  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><p className="eyebrow">NagarDrishti · officer console</p><h1>Good morning, Priya.</h1><p className="dashboard-subtitle">Review and update reports from the shared issue database.</p></div><div className="dashboard-header-actions"><button className="role-switch" onClick={onRefresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button><button className="role-switch" onClick={onSwitchRole}>Citizen view</button></div></header>
    {error && <div className="global-message" role="alert">Could not load live reports: {error} <button onClick={onRefresh}>Retry</button></div>}
    <section className="metric-row"><div className="metric-card"><span>Open queue</span><strong>{issues.filter((issue) => issue.status === 'Open').length}</strong><small>needs triage</small></div><div className="metric-card"><span>In progress</span><strong>{issues.filter((issue) => issue.status === 'In Progress').length}</strong><small>being worked on</small></div><div className="metric-card"><span>Awaiting verification</span><strong>{issues.filter((issue) => issue.status === 'Claimed Resolved').length}</strong><small>citizen review</small></div></section>
    <div className="dashboard-grid"><section className="queue-panel"><div className="dashboard-section-heading"><div><p className="eyebrow">Live triage queue</p><h2>Neighbourhood issues</h2></div><span className="count-badge">{visibleIssues.length} shown</span></div><div className="filter-row" aria-label="Filter issues">{statuses.map((status) => <button key={status} className={filter === status ? 'filter-chip selected' : 'filter-chip'} onClick={() => setFilter(status)}>{status}</button>)}</div>
      {loading && !issues.length ? <p className="empty-state">Loading reports…</p> : visibleIssues.length === 0 ? <p className="empty-state">No reports in this view.</p> : <div className="queue-list">{visibleIssues.map((issue) => <button key={issue.id} className={currentIssue?.id === issue.id ? 'queue-item selected' : 'queue-item'} onClick={() => onSelectIssue(issue)}><span className={`queue-dot ${issue.status.toLowerCase().replaceAll(' ', '-')}`} /><span className="queue-copy"><strong>{issue.title}</strong><small>{issue.publicRef} · {issue.category} · {issue.age}</small></span><span className="queue-arrow">›</span></button>)}</div>}
    </section>
      {currentIssue && <section className="detail-panel"><div className="detail-top"><div><p className="eyebrow">Issue {currentIssue.publicRef}</p><h2>{currentIssue.title}</h2></div><span className={`status ${currentIssue.status.toLowerCase().replaceAll(' ', '-')}`}>{currentIssue.status}</span></div><p className="detail-description">{currentIssue.description}</p><div className="detail-facts"><div><span>Category</span><strong>{currentIssue.category}</strong></div><div><span>Department</span><strong>{currentIssue.department}</strong></div><div><span>Location</span><strong>{currentIssue.ward} · public pin coarsened</strong></div><div><span>Supporters</span><strong>{currentIssue.supporters} neighbours</strong></div></div><div className="priority-callout"><span>!</span><div><strong>Priority {currentIssue.slaBreach ? '· SLA breached' : `· score ${currentIssue.ageInDays} day(s) open`}</strong><small>Review this report and use the available workflow action. The category and routing are advisory/policy based.</small></div></div>
        {nextAction(currentIssue.status) && <button className="proof-button" type="button" disabled={busy} onClick={() => onAdvance(currentIssue)}>{busy ? 'Saving…' : nextAction(currentIssue.status)}</button>}
        {currentIssue.status === 'In Progress' && <div className="resolution-form"><label htmlFor="resolution-note">Resolution note</label><textarea id="resolution-note" rows={3} maxLength={500} value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Describe the work completed. This demo records a note, not a proof photo." /><button className="proof-button" type="button" disabled={busy || resolutionNote.trim().length < 5} onClick={() => onResolve(currentIssue, resolutionNote.trim())}>{busy ? 'Saving…' : 'Submit note and request verification'}</button></div>}
        {currentIssue.status === 'Claimed Resolved' && <p className="workflow-note">This report is waiting for a citizen verification vote.</p>}
        {currentIssue.status === 'Verified Fixed' && <p className="workflow-note">This report has been verified as fixed.</p>}
        <p className="workflow-note">Statuses are changed through the backend workflow. The local demo role shortcut works only while the API is in development mode.</p>
      </section>}
    </div><footer className="dashboard-footer">Connected to live reports · public locations are coarsened</footer>
  </main>;
}
