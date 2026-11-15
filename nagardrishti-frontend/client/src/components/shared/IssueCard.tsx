import { ArrowUpRight, ChevronRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { IssueStatus } from '../../types';
import { CategoryIcon, GeometricMark } from './Primitives';
import { StatusBadge, statusDot } from './StatusBadge';

type CardIssue = {
  id: string;
  publicRef?: string;
  title: string;
  category: string;
  status: string;
  description?: string | null;
  ward?: string | null;
  wardId?: string | null;
  supporterCount?: number;
  supporters?: number;
  age?: string;
  ageInDays?: number;
  [key: string]: any;
};

function formatWardLabel(ward?: string | null, wardId?: string | null) {
  if (ward && ward.trim()) return ward;
  if (wardId && wardId.trim()) {
    const cleaned = wardId.replace(/^ward-/i, '');
    return /^ward\b/i.test(wardId) ? wardId : `Ward ${cleaned}`;
  }
  return 'Pune';
}

export function IssueCard({
  issue,
  variant = 'full',
  onClick,
  onSupport,
  index = 0,
  publicView = false,
  basePath,
}: {
  issue: CardIssue;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  onSupport?: (issue: any) => void;
  index?: number;
  publicView?: boolean;
  basePath?: string;
}) {
  const resolvedBase = (basePath ?? (publicView ? '/transparency/issue' : '/citizen/issue')).replace(/\/$/, '');
  const to = `${resolvedBase}/${issue.publicRef || issue.id}`;
  const wardLabel = formatWardLabel(issue.ward, issue.wardId);
  const supporterCount = issue.supporterCount ?? issue.supporters ?? 0;
  const ageLabel = issue.age || (issue.ageInDays !== undefined ? `${issue.ageInDays}d ago` : 'Recent');
  const dotColor = statusDot[issue.status as IssueStatus] ?? '#B8892D';

  if (variant === 'compact') {
    return (
      <Link to={to} onClick={onClick} className="group flex items-center gap-3 border-b-2 border-[#E8E0D0] bg-[#FDFBF7] px-3 py-4 transition-colors hover:bg-[#D8C9A8]/20">
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#2A3320]" style={{ backgroundColor: dotColor }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#2A3320] group-hover:underline">{issue.title}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/55">{issue.category} <span className="px-1">·</span>{wardLabel} <span className="px-1">·</span>{ageLabel}</p>
        </div>
        <span className="hidden items-center gap-1 text-xs font-bold text-[#2A3320]/60 sm:flex"><Users size={13} />{supporterCount}</span>
        <ChevronRight size={17} className="shrink-0" />
      </Link>
    );
  }

  return (
    <article className="issue-card group relative bg-[#FDFBF7] p-5 md:p-6">
      <GeometricMark index={index} className="absolute right-5 top-5 h-2 w-2" />
      <div className="mb-4 flex items-center justify-between gap-2 pr-5">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#4F5B2A]"><CategoryIcon category={issue.category} size={17} />{issue.category}</span>
        <StatusBadge status={issue.status} />
      </div>
      <Link to={to} onClick={onClick} className="block">
        <h3 className="display-title max-w-[88%] text-xl leading-tight text-[#2A3320] group-hover:underline md:text-2xl">{issue.title}</h3>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#2A3320]/60">
        <span>{ageLabel}</span><span aria-hidden="true">·</span><span className="flex items-center gap-1"><Users size={13} />{supporterCount} supporters</span><span aria-hidden="true">·</span><span>{wardLabel}</span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#2A3320]/80">{issue.description ?? ''}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-[#E8E0D0] pt-4">
        <Link to={to} onClick={onClick} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#4F5B2A] hover:underline">View timeline <ArrowUpRight size={14} /></Link>
        {!publicView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onSupport) {
                onSupport(issue);
              } else {
                onClick?.();
              }
            }}
            className="inline-flex items-center gap-1 border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <span aria-hidden="true">+</span>Support
          </button>
        )}
      </div>
    </article>
  );
}
