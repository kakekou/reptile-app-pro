import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`rounded-[20px] bg-bg-secondary p-5 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </Comp>
  );
}

export function CardSmall({ children, className = '' }: Omit<CardProps, 'onClick'>) {
  return (
    <div className={`rounded-[14px] bg-bg-secondary p-4 ${className}`}>
      {children}
    </div>
  );
}
