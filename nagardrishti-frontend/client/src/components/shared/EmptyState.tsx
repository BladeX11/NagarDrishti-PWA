import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { GeometricMark } from './Primitives';

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <div className="relative overflow-hidden border-4 border-[#2A3320] bg-[#FDFBF7] px-6 py-14 text-center shadow-[6px_6px_0px_0px_#2A3320]">
      <span className="absolute left-[18%] top-8 h-10 w-10 rounded-full bg-[#4F5B2A]/15" />
      <span className="absolute right-[20%] top-10 h-12 w-12 rotate-12 bg-[#B8892D]/15" />
      <span className="absolute bottom-7 left-[24%] h-8 w-8 rotate-45 bg-[#D8C9A8]/60" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center border-4 border-[#2A3320] bg-[#D8C9A8] shadow-[4px_4px_0px_0px_#2A3320]"><Icon size={28} /></div>
      <h2 className="display-title relative mt-6 text-2xl text-[#2A3320]">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#2A3320]/65">{description}</p>
      {action && <Link to={action.href} className="relative mt-6 inline-block"><Button>{action.label}</Button></Link>}
      <GeometricMark index={1} className="absolute right-8 bottom-8 h-2 w-2" />
    </div>
  );
}
