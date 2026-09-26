import { CircleCheck, Dot } from 'lucide-react';
import type { StatusEvent } from '../../types';
import { statusDot } from './StatusBadge';

const readable = (timestamp: string) => {
  const date = new Date(timestamp);
  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};

export function ActivityTimeline({ events, redacted = false }: { events: StatusEvent[]; redacted?: boolean }) {
  const ordered = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (!ordered.length) return <p className="py-5 text-sm text-[#2A3320]/60">No activity has been recorded yet.</p>;
  return (
    <div className="relative ml-2 border-l-4 border-[#2A3320] pl-6">
      {ordered.map((event, index) => (
        <div key={event.id} className="relative border-b border-[#E8E0D0] py-4 last:border-0">
          <span className={`absolute -left-[2.13rem] top-[1.25rem] flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#2A3320] ${index === 0 ? 'border-4' : 'bg-white'}`} style={{ backgroundColor: index === 0 ? statusDot[event.toStatus] : undefined }}>
            {index === 0 && <span className="sr-only">Current status</span>}
          </span>
          <p className="text-sm font-black text-[#2A3320]">{event.fromStatus ? `Status changed to ${event.toStatus}` : 'Issue reported'}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/55">{redacted ? (event.actorRole === 'citizen' ? 'Citizen' : event.actorRole === 'system' ? 'System' : 'Officer') : event.actor} · {readable(event.timestamp)}</p>
          {event.reason && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#2A3320]/75">{event.reason}</p>}
        </div>
      ))}
    </div>
  );
}
