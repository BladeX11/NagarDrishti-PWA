import { useState } from 'react';

export type FilterGroup = { key: string; label: string; options: string[] };

export function FilterBar({ filters, onFilterChange, className = '' }: { filters: FilterGroup[]; onFilterChange?: (key: string, value: string) => void; className?: string }) {
  const [selected, setSelected] = useState<Record<string, string>>(() => Object.fromEntries(filters.map(group => [group.key, group.options[0]])));
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {filters.map(group => (
        <fieldset key={group.key} className="flex flex-wrap items-center gap-1.5 border-0 p-0">
          <legend className="mr-1 inline text-[9px] font-black uppercase tracking-widest text-[#2A3320]/50">{group.label}</legend>
          {group.options.map(option => {
            const active = selected[group.key] === option;
            return <button key={option} type="button" aria-pressed={active} onClick={() => { setSelected(value => ({ ...value, [group.key]: option })); onFilterChange?.(group.key, option); }} className={`border-2 border-[#2A3320] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all active:translate-x-px active:translate-y-px active:shadow-none ${active ? 'bg-[#4F5B2A] text-white shadow-[3px_3px_0px_0px_#2A3320]' : 'bg-white text-[#2A3320] hover:bg-[#E8E0D0]'}`}>{option}</button>;
          })}
        </fieldset>
      ))}
    </div>
  );
}
