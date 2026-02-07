import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.replace(/\s/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          rounded-[14px] bg-bg-tertiary px-4 py-3
          text-[15px] text-text-primary
          placeholder:text-text-tertiary
          outline-none
          focus:ring-2 focus:ring-accent-blue/50
          transition-shadow
          ${error ? 'ring-2 ring-accent-red/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-[12px] text-accent-red">{error}</p>
      )}
    </div>
  );
}
