import type { LucideIcon } from 'lucide-react';

export function MetricCard({ value, label, sublabel, icon: Icon, accentColor = 'olive', trend }: { value: string | number; label: string; sublabel?: string; icon?: LucideIcon; accentColor?: 'olive' | 'gold' | 'sand'; trend?: 'up' | 'down' | 'neutral' }) {
  const accents = {
    olive: 'bg-[#4F5B2A] text-white',
    gold: 'bg-[#B8892D] text-white',
    sand: 'bg-[#D8C9A8] text-[#2A3320]',
  };
  return (
    <div className="metric-card p-5 md:p-6">
      {Icon && <div className={`mb-5 flex h-12 w-12 items-center justify-center border-4 border-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320] ${accents[accentColor]}`}><Icon size={21} /></div>}
      <p className="display-title text-4xl leading-none text-[#2A3320] md:text-5xl">{value}</p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.17em] text-[#2A3320]">{label}</p>
      {sublabel && <p className="mt-1 text-xs font-medium text-[#2A3320]/55">{sublabel}</p>}
      {trend && <p className={`mt-3 text-[10px] font-black uppercase tracking-wider ${trend === 'up' ? 'text-[#4F5B2A]' : trend === 'down' ? 'text-[#8B4513]' : 'text-[#2A3320]/50'}`}>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} this period</p>}
    </div>
  );
}
