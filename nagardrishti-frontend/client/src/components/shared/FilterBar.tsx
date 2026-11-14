import { SlidersHorizontal, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export type FilterGroup = { key: string; label: string; options: string[] };

/** Responsive filter bar: inline chips on md+ screens, compact trigger + bottom sheet on mobile. */
export function FilterBar({
  filters,
  onFilterChange,
  className = '',
  mobileSheet = true,
  mobileRightSlot,
}: {
  filters: FilterGroup[];
  onFilterChange?: (key: string, value: string) => void;
  className?: string;
  mobileSheet?: boolean;
  mobileRightSlot?: ReactNode;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map(group => [group.key, group.options[0]]))
  );
  const [open, setOpen] = useState(false);

  const activeCount = filters.reduce(
    (count, group) => count + (selected[group.key] !== group.options[0] ? 1 : 0),
    0
  );

  function choose(key: string, option: string) {
    setSelected(value => ({ ...value, [key]: option }));
    onFilterChange?.(key, option);
  }

  function resetAll() {
    const defaults: Record<string, string> = {};
    filters.forEach(group => {
      defaults[group.key] = group.options[0];
      if (selected[group.key] !== group.options[0]) {
        onFilterChange?.(group.key, group.options[0]);
      }
    });
    setSelected(defaults);
  }

  return (
    <div className={className}>
      {mobileSheet && (
        <div className="flex items-center justify-between gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-[#2A3320] bg-[#FDFBF7] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320]"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span>Filters{activeCount > 0 ? ` (${activeCount})` : ''}</span>
          </button>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="min-h-[44px] px-2 text-xs font-bold uppercase tracking-wider text-[#4F5B2A] underline"
            >
              Reset
            </button>
          )}
          {mobileRightSlot && <div className="ml-auto">{mobileRightSlot}</div>}
        </div>
      )}

      <div className={`${mobileSheet ? 'hidden md:flex' : 'flex'} flex-wrap items-center gap-3`}>
        {filters.map(group => (
          <fieldset key={group.key} className="flex flex-wrap items-center gap-1.5 border-0 p-0">
            <legend className="mr-1 inline text-[10px] font-black uppercase tracking-widest text-[#2A3320]/60">
              {group.label}
            </legend>
            {group.options.map(option => {
              const active = selected[group.key] === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(group.key, option)}
                  className={`min-h-[38px] border-2 border-[#2A3320] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:translate-x-px active:translate-y-px active:shadow-none md:min-h-0 md:text-[9px] ${
                    active ? 'bg-[#4F5B2A] text-white shadow-[3px_3px_0px_0px_#2A3320]' : 'bg-white text-[#2A3320] hover:bg-[#E8E0D0]'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </fieldset>
        ))}
      </div>

      {mobileSheet && open && (
        <div
          className="fixed inset-0 z-[70] flex flex-col justify-end bg-[#2A3320]/55 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t-4 border-[#2A3320] bg-[#FDFBF7] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b-2 border-[#E8E0D0] pb-3">
              <p className="display-title text-base">Filter issues</p>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {filters.map(group => (
                <fieldset key={group.key} className="border-0 p-0">
                  <legend className="mb-2 block text-xs font-black uppercase tracking-wider text-[#2A3320]/70">
                    {group.label}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map(option => {
                      const active = selected[group.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={active}
                          onClick={() => choose(group.key, option)}
                          className={`min-h-[44px] border-2 border-[#2A3320] px-3.5 py-2 text-xs font-bold uppercase tracking-wide ${
                            active ? 'bg-[#4F5B2A] text-white shadow-[3px_3px_0px_0px_#2A3320]' : 'bg-white text-[#2A3320]'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t-2 border-[#E8E0D0] pt-4">
              <button
                type="button"
                onClick={resetAll}
                className="min-h-[44px] border-2 border-[#2A3320] bg-white px-4 text-xs font-black uppercase tracking-wider"
              >
                Reset all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] border-2 border-[#2A3320] bg-[#B8892D] px-4 text-xs font-black uppercase tracking-wider text-[#2A3320] shadow-[3px_3px_0px_0px_#2A3320]"
              >
                Apply{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
