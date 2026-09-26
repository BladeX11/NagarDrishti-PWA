import type { IssueStatus } from '../../types';

export const statusStyles: Record<IssueStatus, string> = {
  Open: 'bg-[#B8892D]/20 text-[#B8892D]',
  Triaged: 'bg-[#D8C9A8] text-[#2A3320]',
  Assigned: 'bg-[#4F5B2A]/20 text-[#4F5B2A]',
  'In Progress': 'bg-[#4F5B2A] text-white',
  'Claimed Resolved': 'bg-[#B8892D] text-white',
  'Verified Fixed': 'bg-[#2A3320] text-white',
  Reopened: 'bg-[#8B4513]/20 text-[#8B4513]',
};

export function StatusBadge({ status, className = '' }: { status: IssueStatus; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border-2 border-[#2A3320] px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusStyles[status]} ${className}`}>{status}</span>;
}

export const statusDot: Record<IssueStatus, string> = {
  Open: '#B8892D', Triaged: '#D8C9A8', Assigned: '#6B7A3A', 'In Progress': '#4F5B2A',
  'Claimed Resolved': '#B8892D', 'Verified Fixed': '#2A3320', Reopened: '#8B4513',
};
