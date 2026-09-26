import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type AccordionItem = { title: string; content: React.ReactNode };

export function Accordion({ items, defaultOpen = 0 }: { items: AccordionItem[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  return <div className="space-y-3">{items.map((item, index) => <section key={item.title} className="overflow-hidden border-4 border-[#2A3320] bg-[#FDFBF7] shadow-[4px_4px_0px_0px_#2A3320]">
    <button type="button" aria-expanded={open === index} onClick={() => setOpen(current => current === index ? null : index)} className={`flex w-full items-center justify-between px-5 py-4 text-left text-xs font-black uppercase tracking-widest ${open === index ? 'bg-[#4F5B2A] text-white' : 'bg-[#FDFBF7] text-[#2A3320]'}`}>
      {item.title}<ChevronDown size={18} className={`transition-transform duration-200 ${open === index ? 'rotate-180' : ''}`} />
    </button>
    {open === index && <div className="border-t-4 border-[#2A3320] bg-[#D8C9A8]/30 p-5">{item.content}</div>}
  </section>)}</div>;
}
