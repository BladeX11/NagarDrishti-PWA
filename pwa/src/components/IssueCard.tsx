import { Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Issue } from '../types';
import { CATEGORY_META } from '../types';
import { StatusBadge } from './StatusBadge';

interface IssueCardProps {
  issue: Issue;
  compact?: boolean;
}

export function IssueCard({ issue, compact = false }: IssueCardProps) {
  const navigate = useNavigate();
  const meta = CATEGORY_META[issue.category_key] ?? CATEGORY_META['other'];

  return (
    <article
      className="card issue-card"
      style={{ '--card-accent': meta.color } as React.CSSProperties}
      onClick={() => navigate(`/issue/${issue.public_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/issue/${issue.public_id}`)}
      aria-label={`Issue: ${meta.label} in ${issue.ward?.name ?? 'unknown ward'}`}
    >
      {/* Corner decoration */}
      <span className="card-corner geo-square" style={{ backgroundColor: meta.color }} aria-hidden="true" />

      <div className="card-pad" style={{ paddingTop: '20px' }}>
        {/* Category row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: '1.1rem' }} aria-hidden="true">{meta.emoji}</span>
          <span className="text-label" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>

        {/* Description excerpt */}
        {!compact && issue.description_redacted && (
          <p className="text-body" style={{ fontSize: '0.9rem', marginBottom: 10, color: '#3a3520',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {issue.description_redacted}
          </p>
        )}

        {/* Meta row */}
        <div className="issue-card-meta" style={{ marginBottom: 8 }}>
          <StatusBadge status={issue.status} />
          {issue.ward && (
            <span className="text-label" style={{ color: '#7a7060' }}>
              {issue.ward.name}
            </span>
          )}
        </div>

        {/* Footer stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700, color: '#7a7060' }}>
              <Users size={12} aria-hidden="true" />
              {issue.supporter_count}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700, color: '#7a7060' }}>
              <Clock size={12} aria-hidden="true" />
              {issue.age_days}d ago
            </span>
          </div>
          {issue.department && (
            <span className="text-label" style={{ color: '#7a7060', fontSize: '0.6rem' }}>
              {issue.department.name}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
