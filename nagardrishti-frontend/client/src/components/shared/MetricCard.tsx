import type { LucideIcon } from 'lucide-react';

export function MetricCard({
  value,
  label,
  sublabel,
  icon: Icon,
  accentColor = 'olive',
  trend,
}: {
  value: string | number;
  label: string;
  sublabel?: string;
  icon?: LucideIcon;
  accentColor?: 'olive' | 'gold' | 'sand';
  trend?: 'up' | 'down' | 'neutral';
}) {
  const accents = {
    olive: 'bg-[#4F5B2A] text-white',
    gold: 'bg-[#B8892D] text-white',
    sand: 'bg-[#D8C9A8] text-[#2A3320]',
  };
  return (
    <div className="metric-card min-w-0 p-3.5 sm:p-5 md:p-6">
      {Icon && (
        <div
          className={`mb-3 flex h-10 w-10 items-center justify-center border-2 border-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320] sm:mb-5 sm:h-12 sm:w-12 sm:border-4 ${accents[accentColor]}`}
        >
          <Icon size={19} />
        </div>
      )}
      <p className="display-title break-words text-3xl leading-none text-[#2A3320] sm:text-4xl md:text-5xl">
        {value}
      </p>
      <p className="mt-2.5 text-[11px] font-black uppercase tracking-wider text-[#2A3320] sm:mt-3 sm:text-[10px] sm:tracking-[0.17em]">
        {label}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs font-medium text-[#2A3320]/60">{sublabel}</p>
      )}
      {trend && (
        <p
          className={`mt-2.5 text-[11px] font-black uppercase tracking-wider sm:mt-3 sm:text-[10px] ${
            trend === 'up'
              ? 'text-[#4F5B2A]'
              : trend === 'down'
                ? 'text-[#8B4513]'
                : 'text-[#2A3320]/50'
          }`}
        >
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} this period
        </p>
      )}
    </div>
  );
}
