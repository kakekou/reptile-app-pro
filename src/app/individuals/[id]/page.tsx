'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Scale,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Calendar,
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
  LineChart,
  Line,
} from 'recharts';

// ── 定数 ──────────────────────────────────────────────

const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ': 'レオパ',
};

const PERIOD_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '1w', label: '1週間' },
  { key: '1m', label: '1ヶ月' },
  { key: '1y', label: '1年' },
] as const;

// ── 型 ────────────────────────────────────────────────

interface FeedingRow { id: string; fed_at: string }
interface HealthLogRow { id: string; logged_on: string }
interface MeasurementRow { id: string; measured_on: string; weight_g: number | null; length_cm: number | null }
interface ShedRow { id: string; shed_on: string }
interface CareLogRow { id: string; logged_on: string }

// ── ユーティリティ ────────────────────────────────────

function filterByPeriod(data: { date: string; value: number }[], period: string) {
  if (period === 'all') return data;
  const now = Date.now();
  const ms: Record<string, number> = { '1w': 7 * 864e5, '1m': 30 * 864e5, '1y': 365 * 864e5 };
  const cutoff = now - (ms[period] ?? 0);
  return data.filter((d) => new Date(d.date).getTime() >= cutoff);
}

function getMonthIndex(dateStr: string): number {
  return parseInt(dateStr.slice(5, 7), 10) - 1;
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

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    Promise.all([
      supabase.from('individuals').select('*').eq('id', id).single(),
      supabase.from('feedings').select('id, fed_at').eq('individual_id', id),
      supabase.from('health_logs').select('id, logged_on').eq('individual_id', id),
      supabase
        .from('measurements')
        .select('id, measured_on, weight_g, length_cm')
        .eq('individual_id', id)
        .order('measured_on', { ascending: true }),
      supabase.from('sheds').select('id, shed_on').eq('individual_id', id),
      supabase.from('care_logs').select('id, logged_on').eq('individual_id', id),
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

  const totalRecords = feedings.length + healthLogs.length + measurements.length + sheds.length + careLogs.length;

  const latestWeight = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => b.measured_on.localeCompare(a.measured_on));
    for (const m of sorted) {
      if (m.weight_g != null && m.weight_g > 0) return m.weight_g;
    }
    return null;
  }, [measurements]);

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

  // ── 体長・体重チャート用データ ──

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

  // ── ローディング ──

  if (loading || !individual) {
    return (
      <div className="flex items-center justify-center min-h-dvh text-gray-400">
        読み込み中...
      </div>
    );
  }

  // ── 描画 ──

  return (
    <div className="bg-gray-50 min-h-dvh">
      {/* ヘッダー + プロフィール */}
      <div className="bg-white pt-14 pb-5 px-4">
        <Link
          href="/individuals"
          className="flex items-center gap-1 text-blue-600 text-sm font-medium mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧
        </Link>

        <div className="flex items-start gap-4">
          {/* アバター */}
          <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
            {individual.image_url ? (
              <img
                src={individual.image_url}
                alt={individual.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-400">
                {individual.name.charAt(0)}
              </span>
            )}
          </div>

          {/* 個体情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">{individual.name}</h1>
              <span
                className={
                  individual.sex === 'オス'
                    ? 'text-blue-500 font-bold text-lg'
                    : individual.sex === 'メス'
                      ? 'text-pink-500 font-bold text-lg'
                      : 'text-gray-400 text-lg'
                }
              >
                {individual.sex === 'オス' ? '♂' : individual.sex === 'メス' ? '♀' : '?'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-0.5 text-xs font-medium">
                {SPECIES_SHORT[individual.species] ?? individual.species}
              </span>
              {individual.morph && (
                <span className="bg-purple-50 text-purple-700 rounded-full px-3 py-0.5 text-xs font-medium">
                  {individual.morph}
                </span>
              )}
              <span className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-0.5 text-xs font-medium">
                {individual.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-4">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">飼育記録</span>
            </div>
            <p className="text-2xl font-bold text-emerald-800">{totalRecords}</p>
          </div>
          <div className="bg-purple-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">体重</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">
              {latestWeight != null ? `${latestWeight} g` : '--'}
            </p>
          </div>
        </div>

        {/* 各月の記録 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-gray-900">各月の記録</h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setChartYear((y) => y - 1)}>
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <span className="text-sm font-bold text-gray-700 tabular-nums">{chartYear}</span>
              <button type="button" onClick={() => setChartYear((y) => y + 1)}>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {chartYear}年 1月〜12月
          </p>

          {monthlyData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="count"
                    position="top"
                    fontSize={10}
                    fill="#6b7280"
                    formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
              データがありません
            </div>
          )}
        </div>

        {/* 体長の推移 */}
        <TrendChart
          title="体長の推移"
          data={lengthChartData}
          period={lengthPeriod}
          onPeriodChange={setLengthPeriod}
          unit="cm"
        />

        {/* 体重の推移 */}
        <TrendChart
          title="体重の推移"
          data={weightChartData}
          period={weightPeriod}
          onPeriodChange={setWeightPeriod}
          unit="g"
        />
      </div>
    </div>
  );
}

// ── 推移グラフコンポーネント ──────────────────────────

function TrendChart({
  title,
  data,
  period,
  onPeriodChange,
  unit,
}: {
  title: string;
  data: { date: string; value: number }[];
  period: string;
  onPeriodChange: (p: string) => void;
  unit: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>

      {/* 期間フィルタ */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {PERIOD_FILTERS.map((pf) => (
          <button
            type="button"
            key={pf.key}
            onClick={() => onPeriodChange(pf.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              period === pf.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {pf.label}
          </button>
        ))}
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium ml-auto"
        >
          <Calendar className="w-3 h-3" />
          期間指定
        </button>
      </div>

      {/* グラフ */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(v: unknown) => {
                const d = new Date(String(v));
                return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
              }}
              formatter={(v: unknown) => [`${v} ${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 4, fill: '#059669' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
          データがありません
        </div>
      )}
    </div>
  );
}
