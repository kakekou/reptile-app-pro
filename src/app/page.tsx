'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { MiniCalendar } from '@/components/dashboard/mini-calendar';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_STATS = {
  total_individuals: 0,
  feedings_today: 0,
  unhealthy_count: 0,
  active_pairings: 0,
};

interface MonthlyEvents {
  feeding_dates: string[];
  health_dates: string[];
  shed_dates: string[];
  measurement_dates: string[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [events, setEvents] = useState<MonthlyEvents | undefined>();

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc('get_dashboard_stats').then(({ data }) => {
      if (data) setStats(data as typeof DEFAULT_STATS);
    });

    const now = new Date();
    loadEvents(now.getFullYear(), now.getMonth() + 1);
  }, []);

  const loadEvents = (year: number, month: number) => {
    const supabase = createClient();
    supabase.rpc('get_monthly_events', { target_year: year, target_month: month }).then(({ data }) => {
      if (data) setEvents(data as MonthlyEvents);
    });
  };

  return (
    <>
      <PageHeader title="ReptiLog" subtitle="ダッシュボード" />
      <div className="flex flex-col gap-5">
        <SummaryCards stats={stats} />
        <MiniCalendar events={events} onMonthChange={loadEvents} />
      </div>
    </>
  );
}
