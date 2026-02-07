'use client';

import { Turtle, Utensils, HeartPulse, Egg } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: string;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div className="rounded-[20px] bg-bg-secondary p-4 flex flex-col gap-3">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${accent}20` }}
      >
        <div style={{ color: accent }}>{icon}</div>
      </div>
      <div>
        <p className="text-[13px] text-text-secondary">{label}</p>
        <p className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: accent }}>
          {value}
        </p>
      </div>
    </div>
  );
}

interface DashboardStats {
  total_individuals: number;
  feedings_today: number;
  unhealthy_count: number;
  active_pairings: number;
}

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-5">
      <StatCard
        icon={<Turtle size={18} />}
        label="飼育中"
        value={stats.total_individuals}
        accent="var(--accent-blue)"
      />
      <StatCard
        icon={<Utensils size={18} />}
        label="今日の給餌"
        value={stats.feedings_today}
        accent="var(--accent-green)"
      />
      <StatCard
        icon={<HeartPulse size={18} />}
        label="不調の個体"
        value={stats.unhealthy_count}
        accent="var(--accent-red)"
      />
      <StatCard
        icon={<Egg size={18} />}
        label="進行中ペアリング"
        value={stats.active_pairings}
        accent="var(--accent-orange)"
      />
    </div>
  );
}
