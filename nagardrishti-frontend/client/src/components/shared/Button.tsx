import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'olive' | 'gold' | 'sand' | 'outline' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  shape?: 'square' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  olive: 'bg-[#4F5B2A] text-white border-2 border-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320]',
  gold: 'bg-[#B8892D] text-white border-2 border-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320]',
  sand: 'bg-[#D8C9A8] text-[#2A3320] border-2 border-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320]',
  outline: 'bg-[#FDFBF7] text-[#2A3320] border-2 border-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320]',
  ghost: 'bg-transparent text-[#2A3320] border-2 border-transparent hover:bg-[#E8E0D0]',
};

const sizes = { sm: 'px-3 py-2 text-[10px]', md: 'px-4 py-3 text-xs', lg: 'px-6 py-4 text-sm' };

export function Button({ variant = 'olive', shape = 'square', size = 'md', className = '', children, ...props }: Props) {
  const press = variant === 'ghost' ? '' : 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
  return (
    <button className={`inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${shape === 'pill' ? 'rounded-full' : 'rounded-none'} ${press} ${className}`} {...props}>
      {children}
    </button>
  );
}
