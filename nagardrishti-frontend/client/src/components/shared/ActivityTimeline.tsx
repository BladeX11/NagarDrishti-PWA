import type { IssueStatus } from '../../types';
import { statusDot } from './StatusBadge';

type TimelineEvent = {
  id?: string;
  issueId?: string;
  fromStatus?: string | null;
  toStatus: string;
  actor?: string;
  actorRole?: string;
  timestamp?: string;
  createdAt?: string;
  reason?: string | null;
};

const getRawTimestamp = (event: TimelineEvent): string =>
  event.timestamp ?? event.createdAt ?? '';

const toMillis = (event: TimelineEvent): number => {
  const raw = getRawTimestamp(event);
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const readable = (timestamp?: string | null) => {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return 'Recently';
  const hours = Math.max(1, Math.round((Date.now() - ms) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};

const fallbackActorFromRole = (role?: string) => {
  if (role === 'citizen') return 'Citizen';
  if (role === 'system') return 'System';
  if (role === 'admin') return 'Admin';
  return 'Officer';
};

export function ActivityTimeline({ events, redacted = false }: { events: TimelineEvent[]; redacted?: boolean }) {
  const ordered = [...events].sort((a, b) => toMillis(b) - toMillis(a));
  if (!ordered.length) return <p className="py-5 text-sm text-[#2A3320]/60">No activity has been recorded yet.</p>;
  return (
    <div className="relative ml-2 border-l-4 border-[#2A3320] pl-6">
      {ordered.map((event, index) => {
        const roleLabel = fallbackActorFromRole(event.actorRole);
        const actorLabel = redacted ? roleLabel : (event.actor || roleLabel);
        const dotColor = statusDot[event.toStatus as IssueStatus] ?? '#B8892D';
        return (
          <div key={event.id ?? `${event.toStatus}-${index}`} className="relative border-b border-[#E8E0D0] py-4 last:border-0">
            <span className={`absolute -left-[2.13rem] top-[1.25rem] flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#2A3320] ${index === 0 ? 'border-4' : 'bg-white'}`} style={{ backgroundColor: index === 0 ? dotColor : undefined }}>
              {index === 0 && <span className="sr-only">Current status</span>}
            </span>
            <p className="text-sm font-black text-[#2A3320]">{event.fromStatus ? `Status changed to ${event.toStatus}` : 'Issue reported'}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/55">{actorLabel} · {readable(getRawTimestamp(event))}</p>
            {event.reason && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#2A3320]/75">{event.reason}</p>}
          </div>
        );
      })}
    </div>
  );
}
