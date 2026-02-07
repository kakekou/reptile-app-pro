'use client';

import { HeartPulse, Heart, HeartCrack } from 'lucide-react';
import type { ConditionLevel } from '@/types/database';

const CONDITIONS: { level: ConditionLevel; Icon: typeof Heart; color: string; label: string }[] = [
  { level: '絶好調', Icon: HeartPulse, color: '#30d158', label: '絶好調' },
  { level: '普通',   Icon: Heart,      color: '#0a84ff', label: '普通' },
  { level: '不調',   Icon: HeartCrack, color: '#ff453a', label: '不調' },
];

interface ConditionSelectorProps {
  value: ConditionLevel | null;
  onChange: (level: ConditionLevel) => void;
}

export function ConditionSelector({ value, onChange }: ConditionSelectorProps) {
  return (
    <div className="flex gap-3">
      {CONDITIONS.map(({ level, Icon, color, label }) => {
        const isSelected = value === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`
              flex-1 flex flex-col items-center gap-2
              rounded-[16px] p-4
              transition-all active:scale-95
              ${isSelected ? '' : 'bg-bg-tertiary'}
            `}
            style={{
              backgroundColor: isSelected ? `${color}15` : undefined,
              outlineColor: isSelected ? color : undefined,
              outline: isSelected ? `2px solid ${color}` : undefined,
              outlineOffset: '-2px',
            }}
          >
            <Icon
              size={28}
              strokeWidth={isSelected ? 2.2 : 1.4}
              style={{ color: isSelected ? color : 'var(--text-tertiary)' }}
            />
            <span
              className="text-[13px] font-semibold"
              style={{ color: isSelected ? color : 'var(--text-tertiary)' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
