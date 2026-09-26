import { useState } from 'react';
import { Button } from './Button';

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, triggerLabel = 'Open dialog' }: { title: string; description: string; confirmLabel: string; onConfirm: () => void; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>{triggerLabel}</Button>
    {open && <div role="presentation" className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#2A3320]/65 p-4" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md border-4 border-[#2A3320] bg-[#FDFBF7] p-6 shadow-[8px_8px_0px_0px_#2A3320] md:p-8">
        <p className="eyebrow">Please confirm</p><h2 id="confirm-title" className="display-title mt-2 text-2xl">{title}</h2><p className="mt-3 text-sm leading-relaxed text-[#2A3320]/70">{description}</p>
        <div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => { onConfirm(); setOpen(false); }}>{confirmLabel}</Button><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button></div>
      </section>
    </div>}
  </>;
}
