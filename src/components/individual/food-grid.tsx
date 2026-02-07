'use client';

import { Bug, Worm, Mouse, FlaskConical, Plus } from 'lucide-react';
import type { FoodType } from '@/types/database';

const ICON_MAP: Record<string, typeof Bug> = {
  Bug, Worm, Mouse, FlaskConical, Plus,
};

const FOOD_ITEMS: { type: FoodType; iconName: string; label: string }[] = [
  { type: 'コオロギ',     iconName: 'Bug',          label: 'コオロギ' },
  { type: 'デュビア',     iconName: 'Bug',          label: 'デュビア' },
  { type: 'ミルワーム',   iconName: 'Worm',         label: 'ミルワーム' },
  { type: 'ハニーワーム', iconName: 'Worm',         label: 'ハニーワーム' },
  { type: 'シルクワーム', iconName: 'Worm',         label: 'シルクワーム' },
  { type: 'ピンクマウス', iconName: 'Mouse',        label: 'ピンクマウス' },
  { type: '人工フード',   iconName: 'FlaskConical', label: '人工フード' },
  { type: 'その他',       iconName: 'Plus',         label: 'その他' },
];

interface FoodGridProps {
  value: FoodType | null;
  onChange: (type: FoodType) => void;
}

export function FoodGrid({ value, onChange }: FoodGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FOOD_ITEMS.map(({ type, iconName, label }) => {
        const Icon = ICON_MAP[iconName];
        const isSelected = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`
              flex flex-col items-center gap-1.5
              rounded-[14px] p-3
              transition-all active:scale-95
              ${isSelected
                ? 'bg-accent-blue/15 ring-2 ring-accent-blue'
                : 'bg-bg-tertiary'
              }
            `}
          >
            <Icon
              size={22}
              strokeWidth={isSelected ? 2 : 1.4}
              className={isSelected ? 'text-accent-blue' : 'text-text-tertiary'}
            />
            <span className={`text-[11px] font-medium leading-tight text-center ${
              isSelected ? 'text-accent-blue' : 'text-text-tertiary'
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
