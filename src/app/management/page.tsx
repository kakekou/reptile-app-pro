'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Bell,
  Utensils,
  Brush,
  Pill,
  AlertTriangle,
  Scale,
  Ruler,
  Layers,
  Droplets,
  Heart,
  Bath,
  Hand,
  Trash2,
  Hospital,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ── 定数 ──────────────────────────────────────────────

const LINE_COLORS = ['#10b77f', '#8b5cf6', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ': 'レオパ',
};

const FEEDING_INTERVAL_DAYS: Record<string, number> = {
  'ヒョウモントカゲモドキ': 3,
  'ニシアフリカトカゲモドキ': 3,
  'ボールパイソン': 7,
  'フトアゴヒゲトカゲ': 1,
};
const DEFAULT_FEEDING_INTERVAL = 3;
const CLEANING_INTERVAL = 7;
const MEDICATION_INTERVAL = 7;

const LOG_FILTER_TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'feeding', label: '給餌' },
  { key: 'poop', label: '排泄' },
  { key: 'measurement', label: '体重' },
  { key: 'cleaning', label: '掃除' },
  { key: 'other', label: 'その他' },
] as const;

const RECORD_ICONS: Record<string, { icon: typeof Utensils; bg: string; color: string }> = {
  feeding: { icon: Utensils, bg: 'bg-orange-500/10', color: 'text-orange-400' },
  measurement: { icon: Scale, bg: 'bg-purple-500/15', color: 'text-purple-400' },
  health: { icon: Heart, bg: 'bg-green-500/15', color: 'text-green-400' },
  shed: { icon: Layers, bg: 'bg-blue-500/15', color: 'text-blue-400' },
  poop: { icon: ClipboardList, bg: 'bg-yellow-500/15', color: 'text-yellow-400' },
  urine: { icon: Droplets, bg: 'bg-yellow-500/15', color: 'text-yellow-400' },
  cleaning: { icon: Brush, bg: 'bg-teal-500/10', color: 'text-teal-400' },
  bathing: { icon: Bath, bg: 'bg-indigo-500/15', color: 'text-indigo-400' },
  handling: { icon: Hand, bg: 'bg-pink-500/15', color: 'text-pink-400' },
  water_change: { icon: Droplets, bg: 'bg-cyan-500/15', color: 'text-cyan-400' },
  medication: { icon: Pill, bg: 'bg-red-500/10', color: 'text-red-400' },
  hospital: { icon: Hospital, bg: 'bg-rose-500/15', color: 'text-rose-400' },
  mating: { icon: Heart, bg: 'bg-pink-500/15', color: 'text-pink-400' },
  egg_laying: { icon: ClipboardList, bg: 'bg-amber-500/15', color: 'text-amber-400' },
};

const RECORD_LABEL: Record<string, string> = {
  feeding: '給餌',
  measurement: '計測',
  health: '体調記録',
  shed: '脱皮',
  poop: '排泄',
  urine: '排尿',
  cleaning: '掃除',
  bathing: '入浴',
  handling: 'ハンドリング',
  water_change: '水替え',
  medication: '投薬',
  hospital: '通院',
  mating: '交尾',
  egg_laying: '産卵',
};

// ── 型 ────────────────────────────────────────────────

interface IndividualBasic {
  id: string;
  name: string;
  species: string;
}

interface MeasurementRow {
  individual_id: string;
  measured_on: string;
  weight_g: number | null;
  length_cm: number | null;
}

interface FeedingRow {
  id: string;
  individual_id: string;
  fed_at: string;
  food_type: string;
}

interface CareLogRow {
  id: string;
  individual_id: string;
  log_type: string;
  logged_on: string;
}

interface HealthLogRow {
  id: string;
  individual_id: string;
  logged_on: string;
  condition: string;
}

interface ShedRow {
  id: string;
  individual_id: string;
  shed_on: string;
  completeness: string;
}

interface TimelineRecord {
  id: string;
  type: string;
  date: string;
  label: string;
  detail: string;
  individualName: string;
}

interface ScheduleItem {
  individualName: string;
  task: string;
  taskType: 'feeding' | 'cleaning' | 'medication';
  daysRemaining: number;
}

// ── ユーティリティ ────────────────────────────────────

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / 864e5);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── メインページ ──────────────────────────────────────

export default function ManagementPage() {
  const [loading, setLoading] = useState(true);
  const [individuals, setIndividuals] = useState<IndividualBasic[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [feedings, setFeedings] = useState<FeedingRow[]>([]);
  const [careLogs, setCareLogs] = useState<CareLogRow[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLogRow[]>([]);
  const [sheds, setSheds] = useState<ShedRow[]>([]);

  // Chart state
  const [chartMetric, setChartMetric] = useState<'weight' | 'length'>('weight');
  const [chartPeriod, setChartPeriod] = useState<'1m' | '3m' | 'all'>('all');
  const [hiddenIndividuals, setHiddenIndividuals] = useState<Set<string>>(new Set());

  // Log filter state
  const [logFilter, setLogFilter] = useState('all');

  // ── データ取得 ──
  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    Promise.all([
      supabase.from('individuals').select('id, name, species').eq('status', '飼育中').order('name'),
      supabase.from('measurements').select('individual_id, measured_on, weight_g, length_cm').order('measured_on', { ascending: true }),
      supabase.from('feedings').select('id, individual_id, fed_at, food_type').order('fed_at', { ascending: false }).limit(200),
      supabase.from('care_logs').select('id, individual_id, log_type, logged_on').order('logged_on', { ascending: false }).limit(200),
      supabase.from('health_logs').select('id, individual_id, logged_on, condition').order('logged_on', { ascending: false }).limit(200),
      supabase.from('sheds').select('id, individual_id, shed_on, completeness').order('shed_on', { ascending: false }).limit(200),
    ]).then(([indRes, measRes, feedRes, careRes, healthRes, shedRes]) => {
      if (indRes.data) setIndividuals(indRes.data as IndividualBasic[]);
      if (measRes.data) setMeasurements(measRes.data as MeasurementRow[]);
      if (feedRes.data) setFeedings(feedRes.data as FeedingRow[]);
      if (careRes.data) setCareLogs(careRes.data as CareLogRow[]);
      if (healthRes.data) setHealthLogs(healthRes.data as HealthLogRow[]);
      if (shedRes.data) setSheds(shedRes.data as ShedRow[]);
      setLoading(false);
    });
  }, []);

  // ── 個体名マップ ──
  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ind of individuals) map[ind.id] = ind.name;
    return map;
  }, [individuals]);

  // ── 種名マップ ──
  const speciesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ind of individuals) map[ind.id] = ind.species;
    return map;
  }, [individuals]);

  // ── ローディング ──
  if (loading) {
    return (
      <div className="bg-[#0F172A] min-h-dvh pb-32 text-white">
        <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#334155]">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <ClipboardList size={22} className="text-primary" />
              <span className="text-xl font-bold text-white">管理</span>
            </div>
          </div>
        </header>
        <div className="max-w-lg mx-auto pt-20 px-4 flex flex-col gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-700 animate-pulse rounded-2xl h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] min-h-dvh pb-32 text-white">
      {/* ═══ ヘッダー ═══ */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#334155]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <ClipboardList size={22} className="text-primary" />
            <span className="text-xl font-bold text-white">管理</span>
          </div>
          <button className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">
            <Bell size={18} className="text-primary" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto pt-6 pb-24 px-4 flex flex-col gap-6">
        {/* ═══ セクション1: 成長比較グラフ ═══ */}
        <GrowthComparisonSection
          individuals={individuals}
          measurements={measurements}
          nameMap={nameMap}
          chartMetric={chartMetric}
          setChartMetric={setChartMetric}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          hiddenIndividuals={hiddenIndividuals}
          setHiddenIndividuals={setHiddenIndividuals}
        />

        {/* ═══ セクション2: スケジュール ═══ */}
        <ScheduleSection
          individuals={individuals}
          feedings={feedings}
          careLogs={careLogs}
          speciesMap={speciesMap}
          nameMap={nameMap}
        />

        {/* ═══ セクション3: ダッシュボード ═══ */}
        <DashboardSection
          individuals={individuals}
          feedings={feedings}
          healthLogs={healthLogs}
          measurements={measurements}
          careLogs={careLogs}
          sheds={sheds}
          nameMap={nameMap}
        />

        {/* ═══ セクション4: 全体ログ ═══ */}
        <ActivityLogSection
          feedings={feedings}
          careLogs={careLogs}
          healthLogs={healthLogs}
          sheds={sheds}
          measurements={measurements}
          nameMap={nameMap}
          logFilter={logFilter}
          setLogFilter={setLogFilter}
        />
      </div>
    </div>
  );
}

// ── セクション1: 成長比較グラフ ──────────────────────

function GrowthComparisonSection({
  individuals,
  measurements,
  nameMap,
  chartMetric,
  setChartMetric,
  chartPeriod,
  setChartPeriod,
  hiddenIndividuals,
  setHiddenIndividuals,
}: {
  individuals: IndividualBasic[];
  measurements: MeasurementRow[];
  nameMap: Record<string, string>;
  chartMetric: 'weight' | 'length';
  setChartMetric: (m: 'weight' | 'length') => void;
  chartPeriod: '1m' | '3m' | 'all';
  setChartPeriod: (p: '1m' | '3m' | 'all') => void;
  hiddenIndividuals: Set<string>;
  setHiddenIndividuals: (s: Set<string>) => void;
}) {
  const key = chartMetric === 'weight' ? 'weight_g' : 'length_cm';
  const unit = chartMetric === 'weight' ? 'g' : 'cm';

  // 期間フィルタ
  const cutoff = useMemo(() => {
    if (chartPeriod === 'all') return 0;
    const ms: Record<string, number> = { '1m': 30 * 864e5, '3m': 90 * 864e5 };
    return Date.now() - (ms[chartPeriod] ?? 0);
  }, [chartPeriod]);

  // 個体IDリスト (データがある個体のみ)
  const individualIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of measurements) {
      if (m[key] != null && m[key]! > 0) ids.add(m.individual_id);
    }
    return Array.from(ids).filter((id) => nameMap[id]);
  }, [measurements, key, nameMap]);

  // recharts用の統合データ: { date, [個体id]: value, ... }
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>();

    for (const m of measurements) {
      const val = m[key];
      if (val == null || val <= 0) continue;
      if (hiddenIndividuals.has(m.individual_id)) continue;
      if (cutoff > 0 && new Date(m.measured_on).getTime() < cutoff) continue;

      if (!dateMap.has(m.measured_on)) {
        dateMap.set(m.measured_on, { date: m.measured_on });
      }
      dateMap.get(m.measured_on)![m.individual_id] = val;
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      (a.date as string).localeCompare(b.date as string)
    );
  }, [measurements, key, hiddenIndividuals, cutoff]);

  const toggleIndividual = (id: string) => {
    const next = new Set(hiddenIndividuals);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHiddenIndividuals(next);
  };

  const periods: { key: '1m' | '3m' | 'all'; label: string }[] = [
    { key: '1m', label: '1ヶ月' },
    { key: '3m', label: '3ヶ月' },
    { key: 'all', label: '全期間' },
  ];

  return (
    <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 rounded-2xl p-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">成長比較</h2>
          <p className="text-xs text-slate-400">Growth Comparison</p>
        </div>
        {/* 体重/体長トグル */}
        <div className="bg-slate-800 p-1 rounded-lg flex">
          <button
            onClick={() => setChartMetric('weight')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              chartMetric === 'weight'
                ? 'bg-white/10 text-primary font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            体重
          </button>
          <button
            onClick={() => setChartMetric('length')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              chartMetric === 'length'
                ? 'bg-white/10 text-primary font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            体長
          </button>
        </div>
      </div>

      {/* 期間フィルタ */}
      <div className="flex gap-1 mb-4">
        <div className="bg-slate-800 p-1 rounded-lg flex">
          {periods.map((pf) => (
            <button
              key={pf.key}
              onClick={() => setChartPeriod(pf.key)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                chartPeriod === pf.key
                  ? 'bg-white/10 text-primary font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>
      </div>

      {/* グラフ */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => formatShortDate(v)}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: 12,
                color: '#fff',
              }}
              labelFormatter={(v: unknown) => formatShortDate(String(v))}
              formatter={(value: unknown, name: unknown) => [
                `${value} ${unit}`,
                nameMap[String(name)] ?? String(name),
              ]}
            />
            {individualIds
              .filter((id) => !hiddenIndividuals.has(id))
              .map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length], stroke: '#1E293B', strokeWidth: 2 }}
                  connectNulls
                  name={id}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[240px] flex items-center justify-center text-sm text-slate-500">
          データがありません
        </div>
      )}

      {/* 個体フィルターチップ */}
      {individualIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {individualIds.map((id, i) => {
            const isHidden = hiddenIndividuals.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleIndividual(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                  isHidden
                    ? 'bg-slate-800 text-slate-500 line-through'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isHidden
                      ? '#475569'
                      : LINE_COLORS[i % LINE_COLORS.length],
                  }}
                />
                {nameMap[id] ?? id}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── セクション2: スケジュール ─────────────────────────

function ScheduleSection({
  individuals,
  feedings,
  careLogs,
  speciesMap,
  nameMap,
}: {
  individuals: IndividualBasic[];
  feedings: FeedingRow[];
  careLogs: CareLogRow[];
  speciesMap: Record<string, string>;
  nameMap: Record<string, string>;
}) {
  const scheduleItems = useMemo(() => {
    const now = new Date();
    const items: ScheduleItem[] = [];

    for (const ind of individuals) {
      // 給餌スケジュール
      const latestFeed = feedings.find((f) => f.individual_id === ind.id);
      const feedingInterval = FEEDING_INTERVAL_DAYS[ind.species] ?? DEFAULT_FEEDING_INTERVAL;
      if (latestFeed) {
        const daysSince = daysBetween(latestFeed.fed_at.slice(0, 10), now);
        items.push({
          individualName: ind.name,
          task: '給餌',
          taskType: 'feeding',
          daysRemaining: feedingInterval - daysSince,
        });
      } else {
        items.push({
          individualName: ind.name,
          task: '給餌',
          taskType: 'feeding',
          daysRemaining: 0,
        });
      }

      // 掃除スケジュール
      const latestCleaning = careLogs.find(
        (c) => c.individual_id === ind.id && c.log_type === 'cleaning'
      );
      if (latestCleaning) {
        const daysSince = daysBetween(latestCleaning.logged_on, now);
        items.push({
          individualName: ind.name,
          task: '掃除',
          taskType: 'cleaning',
          daysRemaining: CLEANING_INTERVAL - daysSince,
        });
      }

      // 投薬スケジュール
      const latestMed = careLogs.find(
        (c) => c.individual_id === ind.id && c.log_type === 'medication'
      );
      if (latestMed) {
        const daysSince = daysBetween(latestMed.logged_on, now);
        items.push({
          individualName: ind.name,
          task: '投薬',
          taskType: 'medication',
          daysRemaining: MEDICATION_INTERVAL - daysSince,
        });
      }
    }

    // ソート: 期限超過 → 今日 → 未来
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return items;
  }, [individuals, feedings, careLogs]);

  const TASK_STYLE: Record<string, { icon: typeof Utensils; bg: string; color: string }> = {
    feeding: { icon: Utensils, bg: 'bg-orange-500/10', color: 'text-orange-400' },
    cleaning: { icon: Brush, bg: 'bg-teal-500/10', color: 'text-teal-400' },
    medication: { icon: Pill, bg: 'bg-red-500/10', color: 'text-red-400' },
  };

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-white">スケジュール</h2>
        <p className="text-xs text-slate-400">Upcoming Tasks</p>
      </div>

      {scheduleItems.length > 0 ? (
        <div className="flex flex-col gap-2">
          {scheduleItems.slice(0, 10).map((item, i) => {
            const style = TASK_STYLE[item.taskType];
            const Icon = style.icon;
            return (
              <div
                key={`${item.individualName}-${item.task}-${i}`}
                className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={18} className={style.color} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.individualName}</p>
                    <p className="text-xs text-slate-400">{item.task}</p>
                  </div>
                </div>
                <div>
                  {item.daysRemaining < 0 ? (
                    <span className="text-red-400 font-bold text-sm bg-red-500/10 px-2 py-0.5 rounded">
                      {Math.abs(item.daysRemaining)}日超過
                    </span>
                  ) : item.daysRemaining === 0 ? (
                    <span className="text-primary font-bold text-sm">今日</span>
                  ) : (
                    <span className="text-slate-300 text-sm">
                      あと{item.daysRemaining}日
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 rounded-xl p-4 text-slate-500 text-sm text-center">
          スケジュールはありません
        </div>
      )}
    </div>
  );
}

// ── セクション3: ダッシュボード ───────────────────────

function DashboardSection({
  individuals,
  feedings,
  healthLogs,
  measurements,
  careLogs,
  sheds,
  nameMap,
}: {
  individuals: IndividualBasic[];
  feedings: FeedingRow[];
  healthLogs: HealthLogRow[];
  measurements: MeasurementRow[];
  careLogs: CareLogRow[];
  sheds: ShedRow[];
  nameMap: Record<string, string>;
}) {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 飼育中の個体数
  const individualCount = individuals.length;

  // 今月の記録数
  const monthlyCount = useMemo(() => {
    let count = 0;
    for (const f of feedings) if (f.fed_at.startsWith(thisMonth)) count++;
    for (const c of careLogs) if (c.logged_on.startsWith(thisMonth)) count++;
    for (const s of sheds) if (s.shed_on.startsWith(thisMonth)) count++;
    for (const m of measurements) if (m.measured_on.startsWith(thisMonth)) count++;
    for (const h of healthLogs) if (h.logged_on.startsWith(thisMonth)) count++;
    return count;
  }, [feedings, careLogs, sheds, measurements, healthLogs, thisMonth]);

  // 平均体重
  const avgWeight = useMemo(() => {
    const latestByInd = new Map<string, number>();
    // measurements are sorted ascending, so last entry per individual is latest
    for (const m of measurements) {
      if (m.weight_g != null && m.weight_g > 0) {
        latestByInd.set(m.individual_id, m.weight_g);
      }
    }
    if (latestByInd.size === 0) return null;
    const sum = Array.from(latestByInd.values()).reduce((a, b) => a + b, 0);
    return Math.round(sum / latestByInd.size * 10) / 10;
  }, [measurements]);

  // 3日以上未給餌アラート
  const feedingAlerts = useMemo(() => {
    const alerts: { name: string; days: number }[] = [];
    for (const ind of individuals) {
      const latest = feedings.find((f) => f.individual_id === ind.id);
      if (latest) {
        const days = daysBetween(latest.fed_at.slice(0, 10), now);
        if (days >= 3) alerts.push({ name: ind.name, days });
      } else {
        alerts.push({ name: ind.name, days: 999 });
      }
    }
    return alerts.sort((a, b) => b.days - a.days);
  }, [individuals, feedings]);

  // 体調不良アラート
  const healthAlerts = useMemo(() => {
    const alerts: string[] = [];
    const seen = new Set<string>();
    for (const h of healthLogs) {
      if (seen.has(h.individual_id)) continue;
      seen.add(h.individual_id);
      if (h.condition === '不調') {
        alerts.push(nameMap[h.individual_id] ?? h.individual_id);
      }
    }
    return alerts;
  }, [healthLogs, nameMap]);

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-3">ダッシュボード</h2>

      {/* 統計カード 3列 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 p-4 rounded-xl flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">飼育中</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold text-white">{individualCount}</span>
            <span className="text-xs text-slate-400">匹</span>
          </div>
        </div>
        <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 p-4 rounded-xl flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">今月の記録</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold text-white">{monthlyCount}</span>
            <span className="text-xs text-slate-400">件</span>
          </div>
        </div>
        <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 p-4 rounded-xl flex flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">平均体重</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold text-white">{avgWeight ?? '—'}</span>
            {avgWeight != null && <span className="text-xs text-slate-400">g</span>}
          </div>
        </div>
      </div>

      {/* アラート */}
      <div className="flex flex-col gap-2">
        {feedingAlerts.map((alert) => (
          <div
            key={alert.name}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <span className="text-sm text-red-300">
              {alert.name}: {alert.days >= 999 ? '給餌記録なし' : `${alert.days}日間未給餌`}
            </span>
          </div>
        ))}

        {healthAlerts.map((name) => (
          <div
            key={name}
            className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span className="text-sm text-amber-300">{name}: 体調不良</span>
          </div>
        ))}

        {feedingAlerts.length === 0 && healthAlerts.length === 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <span className="text-sm text-primary font-medium">すべて正常です ✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── セクション4: 全体ログ ─────────────────────────────

function ActivityLogSection({
  feedings,
  careLogs,
  healthLogs,
  sheds,
  measurements,
  nameMap,
  logFilter,
  setLogFilter,
}: {
  feedings: FeedingRow[];
  careLogs: CareLogRow[];
  healthLogs: HealthLogRow[];
  sheds: ShedRow[];
  measurements: MeasurementRow[];
  nameMap: Record<string, string>;
  logFilter: string;
  setLogFilter: (f: string) => void;
}) {
  const allRecords = useMemo(() => {
    const records: TimelineRecord[] = [];

    for (const f of feedings.slice(0, 20)) {
      records.push({
        id: `f-${f.id}`,
        type: 'feeding',
        date: f.fed_at.slice(0, 10),
        label: '給餌',
        detail: f.food_type || '',
        individualName: nameMap[f.individual_id] ?? '',
      });
    }
    for (const s of sheds.slice(0, 20)) {
      records.push({
        id: `s-${s.id}`,
        type: 'shed',
        date: s.shed_on,
        label: '脱皮',
        detail: s.completeness || '',
        individualName: nameMap[s.individual_id] ?? '',
      });
    }
    for (const m of [...measurements].reverse().slice(0, 20)) {
      const parts: string[] = [];
      if (m.weight_g != null) parts.push(`${m.weight_g}g`);
      if (m.length_cm != null) parts.push(`${m.length_cm}cm`);
      records.push({
        id: `m-${m.individual_id}-${m.measured_on}`,
        type: 'measurement',
        date: m.measured_on,
        label: '計測',
        detail: parts.join(' / '),
        individualName: nameMap[m.individual_id] ?? '',
      });
    }
    for (const h of healthLogs.slice(0, 20)) {
      records.push({
        id: `h-${h.id}`,
        type: 'health',
        date: h.logged_on,
        label: '体調記録',
        detail: h.condition || '',
        individualName: nameMap[h.individual_id] ?? '',
      });
    }
    for (const c of careLogs.slice(0, 20)) {
      records.push({
        id: `c-${c.id}`,
        type: c.log_type,
        date: c.logged_on,
        label: RECORD_LABEL[c.log_type] ?? c.log_type,
        detail: '',
        individualName: nameMap[c.individual_id] ?? '',
      });
    }

    records.sort((a, b) => b.date.localeCompare(a.date));
    return records;
  }, [feedings, sheds, measurements, healthLogs, careLogs, nameMap]);

  // フィルター適用
  const filtered = useMemo(() => {
    if (logFilter === 'all') return allRecords;
    if (logFilter === 'other') {
      const mainTypes = ['feeding', 'poop', 'measurement', 'cleaning'];
      return allRecords.filter((r) => !mainTypes.includes(r.type));
    }
    return allRecords.filter((r) => r.type === logFilter);
  }, [allRecords, logFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white">全体ログ</h2>
        <button className="text-xs text-primary font-semibold">すべて見る</button>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
        {LOG_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setLogFilter(tab.key)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0 transition-all ${
              logFilter === tab.key
                ? 'bg-primary text-black font-bold'
                : 'bg-slate-800 border border-[#334155] text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ログリスト */}
      {filtered.length > 0 ? (
        <div className="flex flex-col">
          {filtered.slice(0, 20).map((rec, i) => {
            const iconStyle = RECORD_ICONS[rec.type] ?? {
              icon: ClipboardList,
              bg: 'bg-slate-700',
              color: 'text-slate-400',
            };
            const Icon = iconStyle.icon;
            const isLast = i === Math.min(filtered.length, 20) - 1;

            return (
              <div key={rec.id} className="flex gap-3">
                {/* タイムライン */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full ${iconStyle.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={16} className={iconStyle.color} />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-[#334155] my-1" />
                  )}
                </div>

                {/* コンテンツ */}
                <div className="flex-1 pb-4 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{rec.label}</p>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300">
                        {rec.individualName}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">
                      {formatShortDate(rec.date)}
                    </span>
                  </div>
                  {rec.detail && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{rec.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 rounded-xl p-4 text-slate-500 text-sm text-center">
          記録がありません
        </div>
      )}
    </div>
  );
}
