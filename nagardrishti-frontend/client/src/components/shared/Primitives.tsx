import {
  AlertTriangle, Building2, Bug, Droplet, Droplets, HelpCircle, Lightbulb, type LucideIcon, Trash2,
} from 'lucide-react';
import type { Category } from '../../types';

export const categoryIcons: Record<Category, LucideIcon> = {
  'pothole/road': AlertTriangle,
  'garbage/waste': Trash2,
  'drainage/sewage': Droplets,
  'water supply': Droplet,
  'streetlight/electrical': Lightbulb,
  'stray animals': Bug,
  encroachment: Building2,
  other: HelpCircle,
};

export function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) {
  const Icon = categoryIcons[category];
  return <Icon size={size} strokeWidth={2.2} aria-hidden="true" />;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 border-b-4 border-[#2A3320] pb-6 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#B8892D]">{eyebrow}</p>}
        <h1 className="display-title text-3xl leading-none text-[#2A3320] md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-[#2A3320]/70">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function DemoNote({ children = 'Demo data · synthetic records' }: { children?: React.ReactNode }) {
  return <p className="mt-8 border-t-2 border-[#D8C9A8] pt-4 text-[10px] font-bold uppercase tracking-widest text-[#2A3320]/55">{children}</p>;
}

export function GeometricMark({ index = 0, className = '' }: { index?: number; className?: string }) {
  const shapes = ['rounded-full', 'rotate-45', 'clip-triangle'];
  const colors = ['bg-[#4F5B2A]', 'bg-[#B8892D]', 'bg-[#D8C9A8]'];
  return <span aria-hidden="true" className={`geo-mark ${shapes[index % 3]} ${colors[index % 3]} ${className}`} />;
}

export function Panel({ children, className = '', padding = 'p-5 md:p-6' }: { children: React.ReactNode; className?: string; padding?: string }) {
  return <section className={`paper-panel ${padding} ${className}`}>{children}</section>;
}

export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}
