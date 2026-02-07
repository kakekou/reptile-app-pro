import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between px-5 pt-14 pb-4">
      <div>
        {subtitle && (
          <p className="text-[13px] font-medium text-text-tertiary mb-0.5">{subtitle}</p>
        )}
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
