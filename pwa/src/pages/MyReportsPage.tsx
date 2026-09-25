import { useState } from 'react';
import { CheckCircle2, Clock, Users, ChevronRight, RefreshCw } from 'lucide-react';
import { AppBar } from '../components/AppBar';
import { StatusBadge } from '../components/StatusBadge';
import { CATEGORY_META, STATUS_LABELS } from '../types';
import type { Issue, IssueStatus, TimelineEvent } from '../types';

// --- Mock "my reports" data (clearly labelled synthetic) ---
const MY_REPORTS: (Issue & { timeline: TimelineEvent[]; can_verify?: boolean })[] = [
  {
    id: 'r1', public_id: 'f937d0bdb1e3a1b63f',
    category_key: 'pothole/road',
    department: { id: 'd1', name: 'Roads Department' },
    ward: { id: 'w1', code: 'W-01', name: 'Demo Ward 1' },
    status: 'claimed_resolved',
    urgency: null, supporter_count: 7,
    submitted_at: '2026-09-15T07:45:00Z', age_days: 10,
    location: { type: 'coarsened_point', coordinates: [73.8567, 18.5204], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Large pothole near the bus stop on FC Road.',
    can_verify: true,
    timeline: [
      { to_status: 'open',             occurred_at: '2026-09-15T07:45:00Z' },
      { to_status: 'triaged',          occurred_at: '2026-09-16T09:00:00Z', reason: 'Verified by officer' },
      { to_status: 'assigned',         occurred_at: '2026-09-17T10:00:00Z', reason: 'Assigned to Roads crew' },
      { to_status: 'in_progress',      occurred_at: '2026-09-18T08:00:00Z', reason: 'Field work started' },
      { to_status: 'claimed_resolved', occurred_at: '2026-09-23T15:00:00Z', reason: 'Repair completed — proof photo submitted' },
    ],
  },
  {
    id: 'r2', public_id: 'a2c4e6b8d0f2a4c6e8',
    category_key: 'garbage/waste',
    department: { id: 'd2', name: 'Sanitation Department' },
    ward: { id: 'w1', code: 'W-01', name: 'Demo Ward 1' },
    status: 'in_progress',
    urgency: { tier: 2, source: 'ai_suggestion', explanation: 'Recurring category in ward' },
    supporter_count: 14,
    submitted_at: '2026-09-20T10:00:00Z', age_days: 5,
    location: { type: 'coarsened_point', coordinates: [73.860, 18.522], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Garbage bin overflowing for 3 days near Gokhale Nagar school.',
    timeline: [
      { to_status: 'open',        occurred_at: '2026-09-20T10:00:00Z' },
      { to_status: 'triaged',     occurred_at: '2026-09-21T08:30:00Z' },
      { to_status: 'assigned',    occurred_at: '2026-09-22T09:00:00Z' },
      { to_status: 'in_progress', occurred_at: '2026-09-23T07:00:00Z', reason: 'Crew dispatched' },
    ],
  },
  {
    id: 'r3', public_id: 'e8g0i2k4m6o8q0s2u4',
    category_key: 'drainage/sewage',
    department: { id: 'd4', name: 'Water & Drainage Dept.' },
    ward: { id: 'w2', code: 'W-02', name: 'Demo Ward 2' },
    status: 'verified_fixed',
    urgency: null, supporter_count: 9,
    submitted_at: '2026-09-01T09:00:00Z', age_days: 24,
    location: { type: 'coarsened_point', coordinates: [73.862, 18.524], h3_cell: 'demo' },
    analysis_state: 'completed',
    description_redacted: 'Sewage overflow on main road. Completely blocked drainage.',
    timeline: [
      { to_status: 'open',             occurred_at: '2026-09-01T09:00:00Z' },
      { to_status: 'triaged',          occurred_at: '2026-09-02T10:00:00Z' },
      { to_status: 'assigned',         occurred_at: '2026-09-03T08:00:00Z' },
      { to_status: 'in_progress',      occurred_at: '2026-09-05T07:00:00Z' },
      { to_status: 'claimed_resolved', occurred_at: '2026-09-08T14:00:00Z', reason: 'Drain cleared — after-photo attached' },
      { to_status: 'verified_fixed',   occurred_at: '2026-09-10T10:00:00Z', reason: '3 nearby citizens confirmed fix' },
    ],
  },
];

type ViewMode = 'reported' | 'supported';

// Status icon color helper
function statusIconColor(status: IssueStatus): string {
  if (status === 'verified_fixed') return 'var(--color-success)';
  if (status === 'claimed_resolved') return 'var(--color-warning)';
  if (status === 'reopened' || status === 'rejected') return 'var(--color-danger)';
  if (status === 'in_progress') return 'var(--color-accent)';
  return 'var(--color-primary)';
}

export function MyReportsPage() {
  const [view, setView] = useState<ViewMode>('reported');
  const [expandedId, setExpandedId] = useState<string | null>(MY_REPORTS[0].id);

  return (
    <div className="page">
      <AppBar title="My Reports" />

      {/* Toggle: Reported / Supported */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', background: 'var(--color-white)' }}>
        {(['reported', 'supported'] as ViewMode[]).map(v => (
          <button
            key={v}
            aria-selected={view === v}
            role="tab"
            onClick={() => setView(v)}
            style={{
              flex: 1, padding: '12px 8px',
              fontFamily: 'var(--font-family)',
              fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              border: 'none',
              background: view === v ? 'var(--color-primary)' : 'var(--color-white)',
              color: view === v ? 'var(--color-white)' : '#9a8e7a',
              borderBottom: view === v ? '3px solid var(--color-fg)' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 150ms ease-out',
              marginBottom: -2,
            }}
          >
            {v === 'reported' ? `My Reports (${MY_REPORTS.length})` : 'Supported (2)'}
          </button>
        ))}
      </div>

      {/* Demo data label */}
      <p className="text-label" style={{ color: '#9a8e7a', fontSize: '0.6rem', padding: '8px 16px 0' }} role="note">
        Demo data — synthetic records for prototype
      </p>

      <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {view === 'reported' ? (
          MY_REPORTS.map((report, i) => {
            const meta = CATEGORY_META[report.category_key];
            const isExpanded = expandedId === report.id;

            return (
              <div
                key={report.id}
                className={`card animate-slide-up delay-${Math.min(i + 1, 4)}`}
                style={{ '--card-accent': meta.color } as React.CSSProperties}
              >
                {/* Card header — always visible */}
                <button
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', padding: '16px 16px 12px', paddingTop: 20,
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`timeline-${report.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: '1rem' }} aria-hidden="true">{meta.emoji}</span>
                        <span className="text-label" style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-fg)', marginBottom: 8,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {report.description_redacted}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <StatusBadge status={report.status} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 700, color: '#9a8e7a' }}>
                          <Users size={11} aria-hidden="true" /> {report.supporter_count}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 700, color: '#9a8e7a' }}>
                          <Clock size={11} aria-hidden="true" /> {report.age_days}d ago
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      color="#9a8e7a"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease-out', flexShrink: 0 }}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {/* Verification prompt — shown when claimed_resolved */}
                {report.can_verify && (
                  <div style={{
                    margin: '0 16px', marginBottom: 12,
                    background: '#fdf6da', border: '2px solid var(--color-accent)',
                    padding: '10px 12px',
                  }} role="alert" aria-live="polite">
                    <p className="text-label" style={{ color: '#7A6010', marginBottom: 6 }}>
                      Was this fixed? Verify the repair
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.7rem' }}>
                        <CheckCircle2 size={13} aria-hidden="true" /> Fixed
                      </button>
                      <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.7rem' }}>
                        <RefreshCw size={13} aria-hidden="true" /> Not Fixed
                      </button>
                      <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.7rem', color: '#9a8e7a' }}>
                        Unsure
                      </button>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: '#9a7030', marginTop: 6, fontWeight: 500 }}>
                      2 nearby "not fixed" votes will automatically reopen this issue.
                    </p>
                  </div>
                )}

                {/* Expandable timeline */}
                {isExpanded && (
                  <div id={`timeline-${report.id}`} style={{ padding: '0 16px 16px' }} className="animate-fade-in">
                    <hr className="divider" style={{ marginBottom: 12 }} />
                    <p className="text-label" style={{ color: '#9a8e7a', marginBottom: 12 }}>Status timeline</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {report.timeline.map((event, idx) => {
                        const isLast = idx === report.timeline.length - 1;
                        const color = statusIconColor(event.to_status);
                        return (
                          <div key={idx} className="timeline-item" style={{ paddingBottom: isLast ? 0 : 8 }}>
                            {/* Connector line */}
                            {!isLast && <span className="timeline-line" aria-hidden="true" />}

                            <div className={`timeline-dot ${isLast ? 'active' : ''}`} style={{ borderColor: color, background: isLast ? color : 'white' }} aria-hidden="true">
                              {isLast && <CheckCircle2 size={14} color="white" aria-hidden="true" />}
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isLast ? color : 'var(--color-fg)' }}>
                                  {STATUS_LABELS[event.to_status]}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#9a8e7a', fontWeight: 600 }}>
                                  {new Date(event.occurred_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                              {event.reason && (
                                <p style={{ fontSize: '0.75rem', color: '#7a7060', fontWeight: 500, lineHeight: 1.4 }}>
                                  {event.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      className="btn btn-outline btn-full"
                      style={{ marginTop: 12, fontSize: '0.72rem' }}
                    >
                      View Full Detail <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Supported tab — empty state */
          <div className="empty-state">
            <div className="empty-geo">
              <Users size={32} color="var(--color-primary)" aria-hidden="true" />
            </div>
            <p className="text-subheading">No supported issues</p>
            <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
              When you support a nearby report, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
