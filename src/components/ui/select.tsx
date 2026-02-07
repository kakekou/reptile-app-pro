import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export function Select({ label, options, error, className = '', id, ...props }: SelectProps) {
  const selectId = id ?? label?.replace(/\s/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          appearance-none
          rounded-[14px] bg-white border border-gray-300 px-4 py-3
          text-[15px] text-text-primary
          outline-none
          focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue
          transition-shadow
          ${error ? 'ring-2 ring-accent-red/30 border-accent-red' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[12px] text-accent-red">{error}</p>
      )}
    </div>
  );
}
