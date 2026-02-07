'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChevronDown,
  TrendingUp,
  Egg,
  Scale,
  Ruler,
  Calendar,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface IndividualOption {
  id: string;
  name: string;
  species: string;
  morph: string;
}

interface MeasurementRecord {
  id: string;
  measured_on: string;
  weight_g: number | null;
  length_cm: number | null;
  notes: string;
}

interface PairingRecord {
  id: string;
  paired_on: string;
  confirmed: boolean;
  notes: string;
  partner_name: string;
  partner_morph: string;
  role: 'オス' | 'メス';
}

interface ClutchRecord {
  id: string;
  laid_on: string;
  egg_count: number;
  fertile_count: number;
  hatched_on: string | null;
  hatch_count: number;
  incubation_temp_c: number | null;
  notes: string;
}

/* ────────────────────────────────────────────
   Tab Types
   ──────────────────────────────────────────── */

type Tab = 'growth' | 'breeding';

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */

export default function ManagementPage() {
  const [individuals, setIndividuals] = useState<IndividualOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('growth');

  // Growth tab state
  const [metric, setMetric] = useState<'weight' | 'length'>('weight');
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);

  // Breeding tab state
  const [pairings, setPairings] = useState<PairingRecord[]>([]);
  const [clutches, setClutches] = useState<ClutchRecord[]>([]);

  // Load individuals list
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('individuals')
      .select('id, name, species, morph')
      .eq('status', '飼育中')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setIndividuals(data as IndividualOption[]);
          if (data.length > 0) setSelectedId(data[0].id);
        }
      });
  }, []);

  // Load data when individual or tab changes
  useEffect(() => {
    if (!selectedId) return;

    if (activeTab === 'growth') {
      loadGrowthData(selectedId);
    } else {
      loadBreedingData(selectedId);
    }
  }, [selectedId, activeTab]);

  const loadGrowthData = (id: string) => {
    const supabase = createClient();
    supabase
      .from('measurements')
      .select('id, measured_on, weight_g, length_cm, notes')
      .eq('individual_id', id)
      .order('measured_on', { ascending: true })
      .then(({ data }) => {
        if (data) setMeasurements(data as MeasurementRecord[]);
      });
  };

  const loadBreedingData = async (id: string) => {
    const supabase = createClient();

    // Get individual's sex to determine role
    const { data: ind } = await supabase
      .from('individuals')
      .select('sex')
      .eq('id', id)
      .single();

    const sex = (ind as { sex: string } | null)?.sex;

    // Load pairings where this individual is male or female
    const { data: maleData } = await supabase
      .from('pairings')
      .select('id, paired_on, confirmed, notes, female:individuals!pairings_female_id_fkey(name, morph)')
      .eq('male_id', id)
      .order('paired_on', { ascending: false });

    const { data: femaleData } = await supabase
      .from('pairings')
      .select('id, paired_on, confirmed, notes, male:individuals!pairings_male_id_fkey(name, morph)')
      .eq('female_id', id)
      .order('paired_on', { ascending: false });

    const combined: PairingRecord[] = [];

    if (maleData) {
      for (const p of maleData) {
        const partner = p.female as unknown as { name: string; morph: string } | null;
        combined.push({
          id: p.id,
          paired_on: p.paired_on,
          confirmed: p.confirmed,
          notes: p.notes,
          partner_name: partner?.name ?? '--',
          partner_morph: partner?.morph ?? '',
          role: 'オス',
        });
      }
    }

    if (femaleData) {
      for (const p of femaleData) {
        const partner = p.male as unknown as { name: string; morph: string } | null;
        combined.push({
          id: p.id,
          paired_on: p.paired_on,
          confirmed: p.confirmed,
          notes: p.notes,
          partner_name: partner?.name ?? '--',
          partner_morph: partner?.morph ?? '',
          role: 'メス',
        });
      }
    }

    combined.sort((a, b) => new Date(b.paired_on).getTime() - new Date(a.paired_on).getTime());
    setPairings(combined);

    // Load clutches from all pairings
    const pairingIds = combined.map((p) => p.id);
    if (pairingIds.length > 0) {
      const { data: clutchData } = await supabase
        .from('clutches')
        .select('*')
        .in('pairing_id', pairingIds)
        .order('laid_on', { ascending: false });

      if (clutchData) setClutches(clutchData as ClutchRecord[]);
    } else {
      setClutches([]);
    }
  };

  const selectedIndividual = individuals.find((i) => i.id === selectedId);

  return (
    <>
      <PageHeader title="管理" />

      <div className="flex flex-col gap-4 px-5">
        {/* ── 個体セレクター ── */}
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="
              w-full appearance-none
              rounded-[14px] bg-white border border-gray-300 px-4 py-3 pr-10
              text-[15px] text-text-primary font-medium
              outline-none
              focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue
              transition-shadow
            "
          >
            {individuals.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name} ({ind.species === 'ニシアフリカトカゲモドキ' ? 'ニシアフ' : 'レオパ'})
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
        </div>

        {/* ── タブ切替（セグメントコントロール） ── */}
        <div className="flex rounded-[14px] bg-bg-tertiary p-1 gap-1">
          <TabButton
            active={activeTab === 'growth'}
            onClick={() => setActiveTab('growth')}
            icon={<TrendingUp size={15} />}
            label="成長記録"
          />
          <TabButton
            active={activeTab === 'breeding'}
            onClick={() => setActiveTab('breeding')}
            icon={<Egg size={15} />}
            label="繁殖記録"
          />
        </div>

        {/* ── コンテンツエリア ── */}
        {activeTab === 'growth' ? (
          <GrowthTab
            measurements={measurements}
            metric={metric}
            onMetricChange={setMetric}
          />
        ) : (
          <BreedingTab
            pairings={pairings}
            clutches={clutches}
            individualName={selectedIndividual?.name ?? ''}
          />
        )}
      </div>
    </>
  );
}

/* ────────────────────────────────────────────
   Tab Button
   ──────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5
        rounded-[10px] py-2.5
        text-[13px] font-semibold
        transition-all
        ${active
          ? 'bg-white text-text-primary shadow-sm'
          : 'text-text-tertiary hover:text-text-secondary'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────
   Growth Tab
   ──────────────────────────────────────────── */

function GrowthTab({
  measurements,
  metric,
  onMetricChange,
}: {
  measurements: MeasurementRecord[];
  metric: 'weight' | 'length';
  onMetricChange: (m: 'weight' | 'length') => void;
}) {
  const key = metric === 'weight' ? 'weight_g' : 'length_cm';
  const unit = metric === 'weight' ? 'g' : 'cm';
  const color = metric === 'weight' ? '#2563eb' : '#059669';
  const gradientId = `mgmt-gradient-${metric}`;

  const chartData = measurements
    .filter((d) => d[key] !== null)
    .map((d) => ({
      date: d.measured_on,
      value: d[key] as number,
      label: format(new Date(d.measured_on), 'M/d', { locale: ja }),
    }));

  // Calculate growth stats
  const latestValue = chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const prevValue = chartData.length > 1 ? chartData[chartData.length - 2].value : null;
  const growthDiff = latestValue !== null && prevValue !== null ? latestValue - prevValue : null;

  return (
    <>
      {/* メトリック切替 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onMetricChange('weight')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 text-[13px] font-semibold transition-all ${
            metric === 'weight'
              ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
              : 'bg-bg-tertiary text-text-tertiary'
          }`}
        >
          <Scale size={15} />
          体重 (g)
        </button>
        <button
          type="button"
          onClick={() => onMetricChange('length')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-2.5 text-[13px] font-semibold transition-all ${
            metric === 'length'
              ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
              : 'bg-bg-tertiary text-text-tertiary'
          }`}
        >
          <Ruler size={15} />
          体長 (cm)
        </button>
      </div>

      {/* 最新値サマリー */}
      {latestValue !== null && (
        <div className="flex items-baseline gap-2 px-1">
          <span className="text-[32px] font-bold tracking-tight" style={{ color }}>
            {latestValue}
          </span>
          <span className="text-[15px] text-text-secondary font-medium">{unit}</span>
          {growthDiff !== null && (
            <span
              className={`text-[13px] font-semibold ml-1 ${
                growthDiff > 0 ? 'text-emerald-600' : growthDiff < 0 ? 'text-rose-600' : 'text-text-tertiary'
              }`}
            >
              {growthDiff > 0 ? '+' : ''}{growthDiff.toFixed(1)}{unit}
            </span>
          )}
        </div>
      )}

      {/* チャート */}
      <Card>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#6b7280' }}
                formatter={(value) => [`${value} ${unit}`, metric === 'weight' ? '体重' : '体長']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-text-tertiary text-[14px]">
            データがありません
          </div>
        )}
      </Card>

      {/* 計測履歴タイムライン */}
      {measurements.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold mb-3 text-text-secondary flex items-center gap-1.5">
            <Calendar size={14} />
            計測履歴
          </h3>
          <div className="flex flex-col gap-2">
            {[...measurements].reverse().map((rec) => (
              <div
                key={rec.id}
                className="rounded-[14px] bg-white border border-gray-200 shadow-sm p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] text-text-tertiary">
                      {format(new Date(rec.measured_on), 'M/d', { locale: ja })}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {format(new Date(rec.measured_on), 'yyyy', { locale: ja })}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      {rec.weight_g != null && (
                        <span className="text-[13px] font-semibold text-blue-600">
                          {rec.weight_g}g
                        </span>
                      )}
                      {rec.length_cm != null && (
                        <span className="text-[13px] font-semibold text-emerald-600">
                          {rec.length_cm}cm
                        </span>
                      )}
                    </div>
                    {rec.notes && (
                      <p className="text-[11px] text-text-tertiary mt-0.5">{rec.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────
   Breeding Tab
   ──────────────────────────────────────────── */

function BreedingTab({
  pairings,
  clutches,
  individualName,
}: {
  pairings: PairingRecord[];
  clutches: ClutchRecord[];
  individualName: string;
}) {
  if (pairings.length === 0) {
    return (
      <div className="text-center py-16 text-text-tertiary text-[14px]">
        繁殖記録がありません
      </div>
    );
  }

  return (
    <>
      {/* ペアリング情報 */}
      <div>
        <h3 className="text-[14px] font-semibold mb-3 text-text-secondary flex items-center gap-1.5">
          <Heart size={14} className="text-rose-600" />
          ペアリング ({pairings.length}件)
        </h3>
        <div className="flex flex-col gap-3">
          {pairings.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between mb-3">
                <Badge color={p.confirmed ? '#059669' : '#d97706'}>
                  {p.confirmed ? '確認済み' : '未確認'}
                </Badge>
                <span className="text-[12px] text-text-tertiary">
                  {format(new Date(p.paired_on), 'yyyy/M/d', { locale: ja })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-[12px] bg-bg-tertiary p-3 text-center">
                  <p className="text-[11px] text-blue-600 font-medium">
                    {p.role === 'オス' ? individualName : p.partner_name}
                  </p>
                  <p className="text-[12px] font-bold mt-0.5">
                    {p.role === 'オス' ? 'この個体' : p.partner_name}
                  </p>
                </div>

                <ArrowRight size={14} className="text-text-tertiary shrink-0" />

                <div className="flex-1 rounded-[12px] bg-bg-tertiary p-3 text-center">
                  <p className="text-[11px] text-rose-600 font-medium">
                    {p.role === 'メス' ? individualName : p.partner_name}
                  </p>
                  <p className="text-[12px] font-bold mt-0.5">
                    {p.role === 'メス' ? 'この個体' : p.partner_name}
                  </p>
                </div>
              </div>

              {p.notes && (
                <p className="text-[12px] text-text-tertiary mt-2">{p.notes}</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* クラッチ情報 */}
      {clutches.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold mb-3 text-text-secondary flex items-center gap-1.5">
            <Egg size={14} className="text-amber-600" />
            クラッチ ({clutches.length}件)
          </h3>
          <div className="flex flex-col gap-3">
            {clutches.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold">
                    産卵日: {format(new Date(c.laid_on), 'yyyy/M/d', { locale: ja })}
                  </span>
                  {c.hatched_on && (
                    <Badge color="#059669">孵化済み</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatBlock label="産卵数" value={`${c.egg_count}個`} color="#d97706" />
                  <StatBlock label="有精卵" value={`${c.fertile_count}個`} color="#059669" />
                  {c.hatched_on && (
                    <>
                      <StatBlock label="孵化数" value={`${c.hatch_count}匹`} color="#2563eb" />
                      <StatBlock
                        label="孵化日"
                        value={format(new Date(c.hatched_on), 'M/d', { locale: ja })}
                        color="#6b7280"
                      />
                    </>
                  )}
                  {c.incubation_temp_c != null && (
                    <StatBlock label="温度" value={`${c.incubation_temp_c}°C`} color="#e11d48" />
                  )}
                </div>

                {c.notes && (
                  <p className="text-[12px] text-text-tertiary mt-2">{c.notes}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────
   Shared Helpers
   ──────────────────────────────────────────── */

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-[10px] bg-bg-tertiary px-3 py-2">
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <p className="text-[15px] font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
