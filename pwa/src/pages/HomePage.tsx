import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { AppBar } from '../components/AppBar';
import { IssueCard } from '../components/IssueCard';
import type { Issue } from '../types';

// --- Mock seed data (labelled as demo/synthetic per PRD) ---
const MOCK_ISSUES: Issue[] = [
  {
    id: 'i1', public_id: 'f937d0bdb1e3a1b63f',
    category_key: 'pothole/road',
    department: { id: 'd1', name: 'Roads Department' },
    ward: { id: 'w1', code: 'W-01', name: 'Demo Ward 1' },
    status: 'in_progress',
    urgency: { tier: 3, source: 'ai_suggestion', explanation: 'Road hazard near junction' },
    supporter_count: 7,
    submitted_at: '2026-09-18T07:45:00Z', age_days: 7,
    location: { type: 'coarsened_point', coordinates: [73.8567, 18.5204], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Large pothole near the bus stop on FC Road, causing bike accidents.',
  },
  {
    id: 'i2', public_id: 'a2c4e6b8d0f2a4c6e8',
    category_key: 'garbage/waste',
    department: { id: 'd2', name: 'Sanitation Department' },
    ward: { id: 'w1', code: 'W-01', name: 'Demo Ward 1' },
    status: 'open',
    urgency: { tier: 2, source: 'ai_suggestion', explanation: 'Overflowing bin near school' },
    supporter_count: 14,
    submitted_at: '2026-09-20T10:00:00Z', age_days: 5,
    location: { type: 'coarsened_point', coordinates: [73.860, 18.522], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Garbage bin overflowing for 3 days near Gokhale Nagar school.',
  },
  {
    id: 'i3', public_id: 'b3d5f7a9c1e3b5d7f9',
    category_key: 'streetlight/electrical',
    department: { id: 'd3', name: 'Electrical Department' },
    ward: { id: 'w2', code: 'W-02', name: 'Demo Ward 2' },
    status: 'claimed_resolved',
    urgency: null,
    supporter_count: 3,
    submitted_at: '2026-09-15T20:00:00Z', age_days: 10,
    location: { type: 'coarsened_point', coordinates: [73.855, 18.518], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Street light not working on Bhandarkar Road for a week.',
  },
  {
    id: 'i4', public_id: 'c4e6b8d0f2a4c6e8a0',
    category_key: 'drainage/sewage',
    department: { id: 'd4', name: 'Water & Drainage Dept.' },
    ward: { id: 'w2', code: 'W-02', name: 'Demo Ward 2' },
    status: 'reopened',
    urgency: { tier: 4, source: 'ai_suggestion', explanation: 'Health hazard: stagnant water' },
    supporter_count: 22,
    submitted_at: '2026-09-10T09:00:00Z', age_days: 15,
    location: { type: 'coarsened_point', coordinates: [73.862, 18.524], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Sewage overflow on main road, causing health hazard in the area.',
  },
  {
    id: 'i5', public_id: 'd5f7a9b1c3e5f7a9b1',
    category_key: 'water supply',
    department: { id: 'd4', name: 'Water & Drainage Dept.' },
    ward: { id: 'w1', code: 'W-01', name: 'Demo Ward 1' },
    status: 'triaged',
    urgency: { tier: 2, source: 'deterministic_rule', explanation: 'SLA approaching' },
    supporter_count: 5,
    submitted_at: '2026-09-22T06:00:00Z', age_days: 3,
    location: { type: 'coarsened_point', coordinates: [73.858, 18.521], h3_cell: 'demo' },
    analysis_state: 'pending',
    description_redacted: 'No water supply since yesterday morning in entire Prabhat Road area.',
  },
];

const FILTER_TABS = ['All', 'Open', 'In Progress', 'Resolved'];

export function HomePage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);

  useEffect(() => {
    fetch('/api/issues')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.items && data.data.items.length > 0) {
          // Map backend model to PWA model loosely for demo
          const mapped = data.data.items.map((apiIssue: any) => ({
            id: apiIssue.id,
            public_id: apiIssue.publicRef,
            category_key: apiIssue.category,
            department: { id: apiIssue.departmentId || 'd', name: apiIssue.departmentId || 'Department' },
            ward: { id: apiIssue.wardId || 'w', code: 'W', name: apiIssue.wardId || 'Ward' },
            status: apiIssue.status.toLowerCase().replace(' ', '_'),
            urgency: { tier: apiIssue.priority, source: 'system', explanation: apiIssue.urgencyExplanation || '' },
            supporter_count: apiIssue.supporterCount || 0,
            submitted_at: apiIssue.createdAt,
            age_days: apiIssue.ageInDays,
            location: { type: 'coarsened_point', coordinates: [apiIssue.longitude || 0, apiIssue.latitude || 0], h3_cell: 'demo' },
            analysis_state: 'completed',
            description_redacted: apiIssue.description || apiIssue.title,
          }));
          setIssues(mapped);
        }
      })
      .catch(console.error);
  }, []);

  const filteredIssues = issues.filter(issue => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Open') return issue.status === 'open';
    if (activeFilter === 'In Progress') return issue.status === 'in_progress' || issue.status === 'assigned' || issue.status === 'triaged';
    if (activeFilter === 'Resolved') return issue.status === 'verified_fixed' || issue.status === 'claimed_resolved';
    return true;
  });

  // Quick stats
  const stats = {
    open:     issues.filter(i => i.status === 'open').length,
    progress: issues.filter(i => ['triaged','assigned','in_progress'].includes(i.status)).length,
    resolved: issues.filter(i => ['verified_fixed','claimed_resolved'].includes(i.status)).length,
    breached: issues.filter(i => i.age_days > 10 && !['verified_fixed','rejected','duplicate_merged'].includes(i.status)).length,
  };

  return (
    <div className="page">
      <AppBar />

      {/* Hero strip — Bauhaus color block */}
      <section className="block-primary" style={{ padding: '20px 16px 0', position: 'relative', overflow: 'hidden' }}>
        {/* Background dot pattern */}
        <div className="pattern-dots" style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-hidden="true" />

        {/* Geometric decoration */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.2)',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: 8, right: 40,
          width: 40, height: 40,
          backgroundColor: 'rgba(196, 144, 10, 0.3)',
          transform: 'rotate(45deg)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="text-label" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
            Demo Ward 1 — Pune
          </p>
          <h1 className="text-display" style={{ color: 'var(--color-white)', fontSize: 'clamp(2rem, 7vw, 3rem)', marginBottom: 16 }}>
            Nearby<br />Issues
          </h1>
        </div>

        {/* Stats row — 4 blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '2px solid rgba(255,255,255,0.25)', position: 'relative', zIndex: 1 }}>
          {[
            { num: stats.open,     label: 'Open',     Icon: AlertTriangle, color: 'var(--color-accent)' },
            { num: stats.progress, label: 'Active',   Icon: TrendingUp,    color: '#fff' },
            { num: stats.resolved, label: 'Fixed',    Icon: CheckCircle2,  color: '#a8d48a' },
            { num: stats.breached, label: 'Overdue',  Icon: Clock,         color: '#f08080' },
          ].map(({ num, label, Icon, color }, idx) => (
            <div key={label} style={{
              padding: '12px 8px',
              borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
              textAlign: 'center',
            }}>
              <Icon size={14} color={color} style={{ margin: '0 auto 4px' }} aria-hidden="true" />
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{num}</div>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Map placeholder */}
      <div className="map-placeholder" aria-label="Map showing nearby civic issues">
        {/* Simulated map pins */}
        {[
          { x: '30%', y: '40%', color: 'var(--color-primary)', label: 'Pothole' },
          { x: '60%', y: '55%', color: 'var(--color-accent)',  label: 'Garbage' },
          { x: '50%', y: '25%', color: 'var(--color-danger)',  label: 'Drainage' },
          { x: '75%', y: '65%', color: 'var(--color-primary)', label: 'Streetlight' },
        ].map(({ x, y, color, label }) => (
          <div key={label} aria-hidden="true" style={{
            position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{
              width: 16, height: 16, backgroundColor: color, border: '2px solid var(--color-border)',
              boxShadow: '2px 2px 0 #1A1A0E',
            }} />
            <div style={{ width: 2, height: 8, backgroundColor: color }} />
          </div>
        ))}
        <span className="map-placeholder-label" style={{ marginTop: 60 }}>
          Map view (Leaflet integration)
        </span>
      </div>

      {/* Filter tabs */}
      <div style={{ borderBottom: '2px solid var(--color-border)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', padding: '0 8px', minWidth: 'max-content' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              aria-pressed={activeFilter === tab}
              style={{
                padding: '10px 14px',
                fontFamily: 'var(--font-family)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: 'none',
                background: 'none',
                color: activeFilter === tab ? 'var(--color-primary)' : '#9a8e7a',
                borderBottom: activeFilter === tab ? '3px solid var(--color-primary)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
                whiteSpace: 'nowrap',
                marginBottom: -2,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Issue list */}
      <section aria-label="Nearby civic issues" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Demo data label — required by PRD */}
        <p className="text-label" style={{ color: '#9a8e7a', fontSize: '0.6rem' }} role="note">
          Demo data — synthetic records for prototype
        </p>

        {filteredIssues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-geo">
              <CheckCircle2 size={32} color="var(--color-primary)" aria-hidden="true" />
            </div>
            <p className="text-subheading">No issues here</p>
            <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
              This area looks clear. Be the first to report an issue.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue, i) => (
            <div key={issue.id} className={`animate-slide-up delay-${Math.min(i + 1, 4)}`}>
              <IssueCard issue={issue} />
            </div>
          ))
        )}

        {/* Duplicate suggestion banner example */}
        <div className="duplicate-banner" role="alert" aria-live="polite">
          <AlertTriangle size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <div>
            <p className="text-label" style={{ color: '#7A6010', marginBottom: 2 }}>Similar issue nearby</p>
            <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#5a4a10' }}>
              There's already a pothole report 40m away. Support it instead of creating a new one.
            </p>
            <button className="btn btn-accent" style={{ marginTop: 8, padding: '6px 14px', fontSize: '0.7rem' }}>
              View &amp; Support
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
