import { useState } from 'react';
import { ArrowUpRight, ChevronRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { Issue } from '../../types';
import { CategoryIcon, GeometricMark } from './Primitives';
import { StatusBadge, statusDot } from './StatusBadge';
import { issuesApi } from '../../lib/api';
import { isIssueSupportedLocally, addLocalSupport } from '../../data/localDemo';

export function IssueCard({
  issue,
  variant = 'full',
  onClick,
  index = 0,
  publicView = false,
}: {
  issue: Issue;
  variant?: 'compact' | 'full';
  onClick?: () => void;
  index?: number;
  publicView?: boolean;
}) {
  const targetId = (issue as any).publicRef || issue.id;
  const isLocallyVoted = isIssueSupportedLocally(targetId);
  const [supported, setSupported] = useState<boolean>(() => Boolean((issue as any).hasSupported) || isLocallyVoted);
  const [supportCount, setSupportCount] = useState<number>(() => {
    const base = (issue as any).supporterCount ?? issue.supporters ?? 0;
    return isLocallyVoted && !(issue as any).hasSupported ? base + 1 : base;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const photoSrc = (issue as any).photo || (issue as any).photoUrl || (issue as any).media?.find((m: any) => m.type === 'before')?.publicPath || (issue as any).media?.[0]?.publicPath || (issue as any).media?.[0]?.privatePath;

  const to = publicView
    ? `/transparency/issue/${targetId}`
    : `/citizen/issue/${targetId}`;

  const handleSupportClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (supported || isIssueSupportedLocally(targetId)) {
      setSupported(true);
      toast.info('You already support this issue.');
      return;
    }

    addLocalSupport(targetId);
    setSupported(true);
    setSupportCount((prev) => prev + 1);
    toast.success('Thanks for supporting this issue.');

    try {
      const res = await issuesApi.support(targetId);
      if (res && (res.supporterCount !== undefined || (res as any).supporters !== undefined)) {
        setSupportCount(res.supporterCount ?? (res as any).supporters);
      }
    } catch (err: any) {
      if (err.message?.includes('already supporting')) {
        setSupported(true);
      }
    }
  };

  if (variant === 'compact') {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="group flex items-center gap-3 border-b-2 border-[#E8E0D0] bg-[#FDFBF7] px-3 py-4 transition-colors hover:bg-[#D8C9A8]/20"
      >
        {photoSrc ? (
          <img src={photoSrc} alt="" className="h-9 w-9 shrink-0 border-2 border-[#2A3320] object-cover" />
        ) : (
          <span
            className="h-3 w-3 shrink-0 rounded-full border-2 border-[#2A3320]"
            style={{ backgroundColor: statusDot[issue.status] }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#2A3320] group-hover:underline">{issue.title}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/55">
            {issue.category} <span className="px-1">·</span>
            {(issue as any).wardId || issue.ward} <span className="px-1">·</span>
            {issue.age}
          </p>
        </div>
        <span className="hidden items-center gap-1 text-xs font-bold text-[#2A3320]/60 sm:flex">
          <Users size={13} />
          {supportCount}
        </span>
        <ChevronRight size={17} className="shrink-0" />
      </Link>
    );
  }

  return (
    <article className="issue-card group relative bg-[#FDFBF7] p-5 md:p-6">
      <GeometricMark index={index} className="absolute right-5 top-5 h-2 w-2" />
      <div className="mb-4 flex items-center justify-between gap-2 pr-5">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#4F5B2A]">
          <CategoryIcon category={issue.category} size={17} />
          {issue.category}
        </span>
        <StatusBadge status={issue.status} />
      </div>
      <Link to={to} onClick={onClick} className="block">
        <h3 className="display-title max-w-[88%] text-xl leading-tight text-[#2A3320] group-hover:underline md:text-2xl">
          {issue.title}
        </h3>
      </Link>
      {photoSrc && (
        <div className="mt-3 overflow-hidden border-2 border-[#2A3320] bg-[#D8C9A8]/30">
          <img src={photoSrc} alt={issue.title} className="h-44 w-full object-cover grayscale transition-all hover:grayscale-0" />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#2A3320]/60">
        <span>{issue.age}</span>
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1">
          <Users size={13} />
          {supportCount} supporters
        </span>
        <span aria-hidden="true">·</span>
        <span>{(issue as any).wardId || issue.ward}</span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#2A3320]/80">{issue.description}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-[#E8E0D0] pt-4">
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#4F5B2A] hover:underline"
        >
          View timeline <ArrowUpRight size={14} />
        </Link>
        {!publicView && (
          <button
            type="button"
            disabled={loading}
            onClick={handleSupportClick}
            className={`inline-flex items-center gap-1 border-2 border-[#2A3320] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 ${
              supported ? 'bg-[#D8C9A8]/50' : 'bg-[#D8C9A8]'
            }`}
          >
            <span aria-hidden="true">{supported ? '✓' : '＋'}</span>
            {supported ? 'Supported' : 'Support'}
          </button>
        )}
      </div>
    </article>
  );
}
