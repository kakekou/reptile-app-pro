import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-accent-blue text-white hover:bg-accent-blue/90',
  secondary: 'bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80',
  danger:    'bg-accent-red text-white hover:bg-accent-red/90',
  ghost:     'bg-transparent text-accent-blue hover:bg-white/5',
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-[14px] px-5 py-3
        text-[15px] font-semibold
        transition-all active:scale-[0.97]
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
