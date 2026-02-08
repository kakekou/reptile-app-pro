'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Camera,
  Plus,
  X,
  Dna,
  Scale,
  Ruler,
  Utensils,
  Layers,
  Trash2,
  Droplets,
  Bath,
  Heart,
  Hand,
  Pill,
  Hospital,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Individual } from '@/types/database';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  AreaChart,
  Area,
} from 'recharts';

// ── 定数 ──────────────────────────────────────────────

const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ': 'レオパ',
};

const PERIOD_FILTERS = [
  { key: '1m', label: '1ヶ月' },
  { key: '3m', label: '3ヶ月' },
  { key: 'all', label: '全期間' },
] as const;

const RECORD_ICONS: Record<string, typeof Heart> = {
  feeding: Utensils,
  shed: Layers,
  measurement: Ruler,
  health: Heart,
  poop: ClipboardList,
  urine: Droplets,
  cleaning: Trash2,
  bathing: Bath,
  handling: Hand,
  water_change: Droplets,
  medication: Pill,
  hospital: Hospital,
  mating: Heart,
  egg_laying: ClipboardList,
};

const RECORD_STYLE: Record<string, { label: string; iconBg: string; iconColor: string }> = {
  feeding: { label: '給餌', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  shed: { label: '脱皮', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
  measurement: { label: '計測', iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
  health: { label: '体調記録', iconBg: 'bg-green-50', iconColor: 'text-green-500' },
  poop: { label: '排泄', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
  urine: { label: '排尿', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
  cleaning: { label: '掃除', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  bathing: { label: '入浴', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  handling: { label: 'ハンドリング', iconBg: 'bg-pink-50', iconColor: 'text-pink-500' },
  water_change: { label: '水替え', iconBg: 'bg-cyan-50', iconColor: 'text-cyan-500' },
  medication: { label: '投薬', iconBg: 'bg-red-50', iconColor: 'text-red-500' },
  hospital: { label: '通院', iconBg: 'bg-rose-50', iconColor: 'text-rose-500' },
  mating: { label: '交尾', iconBg: 'bg-pink-50', iconColor: 'text-pink-500' },
  egg_laying: { label: '産卵', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
};

// ── 型 ────────────────────────────────────────────────

interface FeedingRow { id: string; fed_at: string; food_type: string }
interface HealthLogRow { id: string; logged_on: string; condition: string }
interface MeasurementRow { id: string; measured_on: string; weight_g: number | null; length_cm: number | null }
interface ShedRow { id: string; shed_on: string; completeness: string }
interface CareLogRow { id: string; logged_on: string; log_type: string }

interface TimelineRecord {
  id: string;
  type: string;
  date: string;
  label: string;
  detail: string;
}

// ── ユーティリティ ────────────────────────────────────

function filterByPeriod(data: { date: string; value: number }[], period: string) {
  if (period === 'all') return data;
  const now = Date.now();
  const ms: Record<string, number> = {
    '1w': 7 * 864e5,
    '1m': 30 * 864e5,
    '3m': 90 * 864e5,
    '1y': 365 * 864e5,
  };
  const cutoff = now - (ms[period] ?? 0);
  return data.filter((d) => new Date(d.date).getTime() >= cutoff);
}

function getMonthIndex(dateStr: string): number {
  return parseInt(dateStr.slice(5, 7), 10) - 1;
}

function calcAge(birthDate: string | null): { years: number; months: number } | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return { years, months };
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── メインページ ──────────────────────────────────────

export default function IndividualDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [individual, setIndividual] = useState<Individual | null>(null);
  const [feedings, setFeedings] = useState<FeedingRow[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLogRow[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [sheds, setSheds] = useState<ShedRow[]>([]);
  const [careLogs, setCareLogs] = useState<CareLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [lengthPeriod, setLengthPeriod] = useState('all');
  const [weightPeriod, setWeightPeriod] = useState('all');
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    Promise.all([
      supabase.from('individuals').select('*').eq('id', id).single(),
      supabase.from('feedings').select('id, fed_at, food_type').eq('individual_id', id),
      supabase.from('health_logs').select('id, logged_on, condition').eq('individual_id', id),
      supabase
        .from('measurements')
        .select('id, measured_on, weight_g, length_cm')
        .eq('individual_id', id)
        .order('measured_on', { ascending: true }),
      supabase.from('sheds').select('id, shed_on, completeness').eq('individual_id', id),
      supabase.from('care_logs').select('id, logged_on, log_type').eq('individual_id', id),
    ]).then(([indRes, feedRes, healthRes, measRes, shedRes, careRes]) => {
      if (indRes.data) setIndividual(indRes.data as Individual);
      setFeedings((feedRes.data ?? []) as FeedingRow[]);
      setHealthLogs((healthRes.data ?? []) as HealthLogRow[]);
      setMeasurements((measRes.data ?? []) as MeasurementRow[]);
      setSheds((shedRes.data ?? []) as ShedRow[]);
      setCareLogs((careRes.data ?? []) as CareLogRow[]);
      setLoading(false);
    });
  }, [id]);

  // ── 集計値 ──

  const { latestWeight, weightDiff } = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => b.measured_on.localeCompare(a.measured_on));
    let latest: number | null = null;
    let prev: number | null = null;
    for (const m of sorted) {
      if (m.weight_g != null && m.weight_g > 0) {
        if (latest == null) { latest = m.weight_g; }
        else if (prev == null) { prev = m.weight_g; break; }
      }
    }
    return {
      latestWeight: latest,
      weightDiff: latest != null && prev != null ? +(latest - prev).toFixed(1) : null,
    };
  }, [measurements]);

  const { latestLength, lengthDiff } = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => b.measured_on.localeCompare(a.measured_on));
    let latest: number | null = null;
    let prev: number | null = null;
    for (const m of sorted) {
      if (m.length_cm != null && m.length_cm > 0) {
        if (latest == null) { latest = m.length_cm; }
        else if (prev == null) { prev = m.length_cm; break; }
      }
    }
    return {
      latestLength: latest,
      lengthDiff: latest != null && prev != null ? +(latest - prev).toFixed(1) : null,
    };
  }, [measurements]);

  const age = useMemo(() => calcAge(individual?.birth_date ?? null), [individual?.birth_date]);

  // ── 月別集計 ──

  const monthlyData = useMemo(() => {
    const counts = Array.from({ length: 12 }, (_, i) => ({ month: `${i + 1}月`, count: 0 }));
    const y = String(chartYear);

    const addDate = (dateStr: string) => {
      if (dateStr.startsWith(y)) {
        const m = getMonthIndex(dateStr);
        if (m >= 0 && m < 12) counts[m].count++;
      }
    };

    for (const f of feedings) addDate(f.fed_at.slice(0, 10));
    for (const h of healthLogs) addDate(h.logged_on);
    for (const m of measurements) addDate(m.measured_on);
    for (const s of sheds) addDate(s.shed_on);
    for (const c of careLogs) addDate(c.logged_on);

    return counts;
  }, [feedings, healthLogs, measurements, sheds, careLogs, chartYear]);

  // ── チャートデータ ──

  const lengthChartData = useMemo(() => {
    const data = measurements
      .filter((m) => m.length_cm != null && m.length_cm > 0)
      .map((m) => ({ date: m.measured_on, value: m.length_cm! }));
    return filterByPeriod(data, lengthPeriod);
  }, [measurements, lengthPeriod]);

  const weightChartData = useMemo(() => {
    const data = measurements
      .filter((m) => m.weight_g != null && m.weight_g > 0)
      .map((m) => ({ date: m.measured_on, value: m.weight_g! }));
    return filterByPeriod(data, weightPeriod);
  }, [measurements, weightPeriod]);

  // ── 最近の記録 ──

  const recentRecords = useMemo(() => {
    const records: TimelineRecord[] = [];

    for (const f of feedings) {
      records.push({
        id: `f-${f.id}`,
        type: 'feeding',
        date: f.fed_at.slice(0, 10),
        label: '給餌',
        detail: f.food_type || '',
      });
    }
    for (const s of sheds) {
      records.push({
        id: `s-${s.id}`,
        type: 'shed',
        date: s.shed_on,
        label: '脱皮',
        detail: s.completeness || '',
      });
    }
    for (const m of measurements) {
      const parts: string[] = [];
      if (m.weight_g != null) parts.push(`${m.weight_g}g`);
      if (m.length_cm != null) parts.push(`${m.length_cm}cm`);
      records.push({
        id: `m-${m.id}`,
        type: 'measurement',
        date: m.measured_on,
        label: '計測',
        detail: parts.join(' / '),
      });
    }
    for (const h of healthLogs) {
      records.push({
        id: `h-${h.id}`,
        type: 'health',
        date: h.logged_on,
        label: '体調記録',
        detail: h.condition || '',
      });
    }
    for (const c of careLogs) {
      const style = RECORD_STYLE[c.log_type];
      records.push({
        id: `c-${c.id}`,
        type: c.log_type,
        date: c.logged_on,
        label: style?.label ?? c.log_type,
        detail: '',
      });
    }

    records.sort((a, b) => b.date.localeCompare(a.date));
    return records.slice(0, 5);
  }, [feedings, sheds, measurements, healthLogs, careLogs]);

  // ── ローディング ──

  if (loading || !individual) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#F8FAFC] text-slate-400">
        読み込み中...
      </div>
    );
  }

  const hasImage = !!individual.image_url;

  // ── 描画 ──

  return (
    <div className="bg-[#F8FAFC] min-h-dvh">
      {/* ═══ 固定トップナビ ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F8FAFC]/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <Link
            href="/individuals"
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div className="text-center">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              個体詳細
            </p>
            <p className="text-base font-bold tracking-tight text-slate-800 leading-tight">
              {individual.name}
            </p>
          </div>
          <button className="w-10 h-10 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Pencil size={18} className="text-primary" />
          </button>
        </div>
      </header>

      {/* ═══ コンテンツ ═══ */}
      <div className="max-w-lg mx-auto pt-20 pb-24 px-4 flex flex-col gap-6">
        {/* ═══ ヒーロー画像 ═══ */}
        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] relative">
          {hasImage ? (
            <>
              <img
                src={individual.image_url!}
                alt={individual.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-slate-200 flex items-center justify-center">
              <span className="text-6xl font-black text-slate-400">
                {individual.name.charAt(0)}
              </span>
            </div>
          )}

          {/* バッジ群 */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 flex-wrap">
            {individual.sex !== '不明' && (
              <span
                className={`px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold ${
                  individual.sex === 'オス' ? 'text-blue-500' : 'text-rose-500'
                }`}
              >
                {individual.sex === 'オス' ? '♂ オス' : '♀ メス'}
              </span>
            )}
            <span className="px-2.5 py-1 bg-primary/90 text-white rounded-lg text-xs font-bold">
              {individual.status}
            </span>
            <span
              className={`px-2.5 py-1 backdrop-blur-sm rounded-lg text-xs font-bold ${
                hasImage ? 'bg-white/50 text-white' : 'bg-white/70 text-slate-600'
              }`}
            >
              {SPECIES_SHORT[individual.species] ?? individual.species}
            </span>
            {individual.morph && (
              <span className="px-2.5 py-1 bg-purple-500/80 backdrop-blur-sm text-white rounded-lg text-xs font-bold">
                {individual.morph}
              </span>
            )}
          </div>

          {/* カメラボタン */}
          <button
            className={`absolute bottom-4 right-4 z-20 p-2 rounded-full ${
              hasImage
                ? 'bg-white/20 backdrop-blur-md text-white'
                : 'bg-white/50 backdrop-blur-md text-slate-500'
            }`}
          >
            <Camera size={18} />
          </button>
        </div>

        {/* ═══ ステータスカード（3列） ═══ */}
        <div className="grid grid-cols-3 gap-3">
          {/* 体重 */}
          <div className="bg-white rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center justify-center gap-1">
            <span className="text-xs font-medium text-slate-500">現在の体重</span>
            {latestWeight != null ? (
              <>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-extrabold text-primary tracking-tight">
                    {latestWeight}
                  </span>
                  <span className="text-sm text-primary/80">g</span>
                </div>
                {weightDiff != null && weightDiff !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      weightDiff > 0
                        ? 'text-primary bg-primary/10'
                        : 'text-red-500 bg-red-50'
                    }`}
                  >
                    {weightDiff > 0 ? '+' : ''}{weightDiff}g
                  </span>
                )}
              </>
            ) : (
              <span className="text-2xl font-extrabold text-slate-300">&mdash;</span>
            )}
          </div>

          {/* 全長 */}
          <div className="bg-white rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center justify-center gap-1">
            <span className="text-xs font-medium text-slate-500">全長</span>
            {latestLength != null ? (
              <>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {latestLength}
                  </span>
                  <span className="text-sm text-slate-500">cm</span>
                </div>
                {lengthDiff != null && lengthDiff !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      lengthDiff > 0
                        ? 'text-primary bg-primary/10'
                        : 'text-red-500 bg-red-50'
                    }`}
                  >
                    {lengthDiff > 0 ? '+' : ''}{lengthDiff}cm
                  </span>
                )}
              </>
            ) : (
              <span className="text-2xl font-extrabold text-slate-300">&mdash;</span>
            )}
          </div>

          {/* 年齢 */}
          <div className="bg-white rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col items-center justify-center gap-1">
            <span className="text-xs font-medium text-slate-500">年齢</span>
            {age ? (
              <>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-extrabold text-slate-900">{age.years}</span>
                  <span className="text-xs text-slate-500">歳</span>
                  <span className="text-xl font-extrabold text-slate-900">{age.months}</span>
                  <span className="text-xs text-slate-500">ヶ月</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  孵化: {new Date(individual.birth_date!).getFullYear()}年
                </span>
              </>
            ) : (
              <span className="text-2xl font-extrabold text-slate-300">&mdash;</span>
            )}
          </div>
        </div>

        {/* ═══ 体重の推移 ═══ */}
        <TrendChart
          title="体重の推移"
          subtitle="Growth Trajectory"
          data={weightChartData}
          period={weightPeriod}
          onPeriodChange={setWeightPeriod}
          unit="g"
          color="#10b77f"
          gradientId="weightGradient"
        />

        {/* ═══ 体長の推移 ═══ */}
        <TrendChart
          title="体長の推移"
          subtitle="Length Trajectory"
          data={lengthChartData}
          period={lengthPeriod}
          onPeriodChange={setLengthPeriod}
          unit="cm"
          color="#2563eb"
          gradientId="lengthGradient"
        />

        {/* ═══ 各月の記録 ═══ */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-base font-bold text-slate-900">各月の記録</h2>
              <p className="text-xs text-slate-500">Monthly Activity</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setChartYear((y) => y - 1)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={18} className="text-slate-400" />
              </button>
              <span className="text-sm font-bold text-slate-700 tabular-nums">{chartYear}</span>
              <button
                type="button"
                onClick={() => setChartYear((y) => y + 1)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-4">
            {monthlyData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar dataKey="count" fill="#10b77f" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      fontSize={10}
                      fill="#94a3b8"
                      formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
                データがありません
              </div>
            )}
          </div>
        </div>

        {/* ═══ 最近の記録 ═══ */}
        {recentRecords.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">最近の記録</h2>
              <button className="text-xs font-semibold text-primary">すべて見る</button>
            </div>
            <div className="flex flex-col gap-2">
              {recentRecords.map((rec) => {
                const style = RECORD_STYLE[rec.type] ?? {
                  label: rec.type,
                  iconBg: 'bg-gray-100',
                  iconColor: 'text-gray-500',
                };
                const Icon = RECORD_ICONS[rec.type] ?? ClipboardList;
                return (
                  <div
                    key={rec.id}
                    className="bg-white p-4 rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center gap-3"
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <Icon size={18} className={style.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{rec.label}</p>
                      {rec.detail && (
                        <p className="text-xs text-slate-500 truncate">{rec.detail}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">
                      {formatShortDate(rec.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 遺伝・メモ ═══ */}
        <div className="bg-white rounded-xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Dna size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-slate-900">遺伝・メモ</h2>
          </div>

          {individual.genes && individual.genes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {individual.genes.map((gene, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary"
                >
                  {gene.locus}
                  {gene.copies === 2 ? ' (ホモ)' : gene.copies === 1 ? ' (het)' : ''}
                </span>
              ))}
            </div>
          )}

          {individual.notes && (
            <p className="text-sm text-slate-500 leading-relaxed">{individual.notes}</p>
          )}

          {!individual.notes && (!individual.genes || individual.genes.length === 0) && (
            <p className="text-sm text-slate-400">メモはありません</p>
          )}
        </div>
      </div>

      {/* ═══ FAB メニューオーバーレイ ═══ */}
      {showFabMenu && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setShowFabMenu(false)}
        />
      )}

      {/* ═══ FAB メニュー ═══ */}
      {showFabMenu && (
        <div className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-2">
          <Link
            href={`/individuals/${id}/feeding`}
            className="flex items-center gap-3 bg-white rounded-full pl-4 pr-5 py-3 shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Utensils size={16} className="text-primary" />
            </div>
            <span className="text-sm font-bold text-slate-800">給餌</span>
          </Link>
          <Link
            href={`/individuals/${id}/growth`}
            className="flex items-center gap-3 bg-white rounded-full pl-4 pr-5 py-3 shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Scale size={16} className="text-purple-500" />
            </div>
            <span className="text-sm font-bold text-slate-800">計測</span>
          </Link>
          <Link
            href={`/individuals/${id}/health`}
            className="flex items-center gap-3 bg-white rounded-full pl-4 pr-5 py-3 shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <Heart size={16} className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-slate-800">体調</span>
          </Link>
        </div>
      )}

      {/* ═══ FAB ═══ */}
      <button
        onClick={() => setShowFabMenu(!showFabMenu)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-primary hover:bg-emerald-600 rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        {showFabMenu ? (
          <X size={28} className="text-white" />
        ) : (
          <Plus size={28} className="text-white" />
        )}
      </button>
    </div>
  );
}

// ── 推移グラフコンポーネント ──────────────────────────

function TrendChart({
  title,
  subtitle,
  data,
  period,
  onPeriodChange,
  unit,
  color,
  gradientId,
}: {
  title: string;
  subtitle: string;
  data: { date: string; value: number }[];
  period: string;
  onPeriodChange: (p: string) => void;
  unit: string;
  color: string;
  gradientId: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="bg-gray-100 p-1 rounded-lg flex">
          {PERIOD_FILTERS.map((pf) => (
            <button
              type="button"
              key={pf.key}
              onClick={() => onPeriodChange(pf.key)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                period === pf.key
                  ? 'bg-white text-primary font-bold shadow-sm'
                  : 'text-slate-500 font-medium'
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>
      </div>

      {/* グラフ */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(v: unknown) => {
                const d = new Date(String(v));
                return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
              }}
              formatter={(v: unknown) => [`${v} ${unit}`, title]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={{ fill: '#fff', stroke: color, strokeWidth: 2, r: 4 }}
              activeDot={{ fill: color, stroke: '#fff', strokeWidth: 2, r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-sm text-slate-400">
          データがありません
        </div>
      )}
    </div>
  );
}
