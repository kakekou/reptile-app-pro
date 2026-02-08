'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  X,
  Smile,
  Meh,
  Frown,
  Utensils,
  Circle,
  Droplets,
  Ban,
  Eye,
  Sparkles,
  AlertTriangle,
  Scale,
  Ruler,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── 定数 ──────────────────────────────────────────────

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const CONDITION_OPTIONS = [
  { label: '好調', dbValue: '絶好調', icon: Smile },
  { label: '普通', dbValue: '普通', icon: Meh },
  { label: '不調', dbValue: '不調', icon: Frown },
] as const;

const POOP_OPTIONS = [
  { label: '固形', value: '固形', icon: Circle, hoverDanger: false },
  { label: '下痢', value: '下痢', icon: Droplets, hoverDanger: false },
  { label: 'なし', value: 'なし', icon: Ban, hoverDanger: true },
] as const;

const URINE_OPTIONS = [
  { label: '白い', value: '白い', type: 'white' as const },
  { label: '黄色', value: '黄色', type: 'yellow' as const },
  { label: 'なし', value: 'なし', type: 'none' as const },
] as const;

const SHED_OPTIONS = [
  { label: '白濁', value: '白濁', icon: Eye, hoverClass: 'hover:border-[#10B981]/50' },
  { label: '脱皮完了', value: '脱皮完了', icon: Sparkles, hoverClass: 'hover:border-[#10B981]/50' },
  { label: '不完全', value: '不完全', icon: AlertTriangle, hoverClass: 'hover:border-yellow-500/50' },
] as const;

// ── ユーティリティ ────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${y}年${m}月${d}日(${WEEKDAYS[date.getDay()]})`;
}

// ── メインコンテンツ ──────────────────────────────────

function RecordPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const individualId = searchParams.get('individual_id') ?? '';
  const dateParam = searchParams.get('date') ?? '';
  const sectionParam = searchParams.get('section') ?? '';

  // ── ステート ──
  const [condition, setCondition] = useState<string | null>(null);
  const [poop, setPoop] = useState<string | null>(null);
  const [urine, setUrine] = useState<string | null>(null);
  const [shed, setShed] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 既存レコードID（UPSERT用）
  const [existingHealthLogId, setExistingHealthLogId] = useState<string | null>(null);
  const [existingCareLogIds, setExistingCareLogIds] = useState<Record<string, string>>({});
  const [existingShedId, setExistingShedId] = useState<string | null>(null);
  const [existingMeasurementId, setExistingMeasurementId] = useState<string | null>(null);

  // 給餌サマリー（既存レコード表示用）
  const [feedingSummary, setFeedingSummary] = useState<{ id: string; food_type: string; quantity: number }[]>([]);

  // 給餌インライン入力
  const [foodType, setFoodType] = useState('');
  const [feedQuantity, setFeedQuantity] = useState('');
  const [feedUnit, setFeedUnit] = useState<'個' | 'g'>('個');
  const [supplements, setSupplements] = useState({ calcium: false, vitamin: false });
  const [refused, setRefused] = useState(false);
  const [foodHistory, setFoodHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // サジェスト用ref
  const suggestionWrapperRef = useRef<HTMLDivElement>(null);

  // セクションref（auto-scroll用）
  const conditionRef = useRef<HTMLElement>(null);
  const feedingRef = useRef<HTMLElement>(null);
  const poopRef = useRef<HTMLElement>(null);
  const urineRef = useRef<HTMLElement>(null);
  const sheddingRef = useRef<HTMLElement>(null);
  const weightRef = useRef<HTMLElement>(null);

  const sectionRefMap: Record<string, React.RefObject<HTMLElement | null>> = {
    condition: conditionRef,
    feeding: feedingRef,
    poop: poopRef,
    urine: urineRef,
    shedding: sheddingRef,
    weight: weightRef,
  };

  // ── 既存データの読み込み ──
  useEffect(() => {
    if (!individualId || !dateParam) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    Promise.all([
      supabase.from('health_logs').select('id, condition')
        .eq('individual_id', individualId).eq('logged_on', dateParam).limit(1),
      supabase.from('care_logs').select('id, care_type, value')
        .eq('individual_id', individualId).eq('logged_on', dateParam),
      supabase.from('sheds').select('id, completeness')
        .eq('individual_id', individualId).eq('shed_on', dateParam).limit(1),
      supabase.from('measurements').select('id, weight_g, length_cm')
        .eq('individual_id', individualId).eq('measured_on', dateParam).limit(1),
      supabase.from('feedings').select('id, food_type, quantity')
        .eq('individual_id', individualId)
        .gte('fed_at', dateParam + 'T00:00:00')
        .lte('fed_at', dateParam + 'T23:59:59'),
    ]).then(([healthRes, careRes, shedRes, measRes, feedRes]) => {
      // health_logs
      if (healthRes.data?.[0]) {
        setCondition(healthRes.data[0].condition);
        setExistingHealthLogId(healthRes.data[0].id);
      }

      // care_logs
      const careIdMap: Record<string, string> = {};
      if (careRes.data) {
        for (const c of careRes.data) {
          careIdMap[c.care_type] = c.id;
          if (c.care_type === 'poop') setPoop(c.value);
          else if (c.care_type === 'urine') setUrine(c.value);
          else if (c.care_type === 'shed') setShed(c.value);
        }
      }
      setExistingCareLogIds(careIdMap);

      // sheds（care_logsの白濁より優先）
      if (shedRes.data?.[0]) {
        setShed(shedRes.data[0].completeness === '完全' ? '脱皮完了' : '不完全');
        setExistingShedId(shedRes.data[0].id);
      }

      // measurements
      if (measRes.data?.[0]) {
        if (measRes.data[0].weight_g) setWeight(String(measRes.data[0].weight_g));
        if (measRes.data[0].length_cm) setLength(String(measRes.data[0].length_cm));
        setExistingMeasurementId(measRes.data[0].id);
      }

      // feedings
      if (feedRes.data && feedRes.data.length > 0) {
        setFeedingSummary(feedRes.data);
      }

      setLoading(false);
    });
  }, [individualId, dateParam]);

  // ── sectionパラメータによるauto-scroll ──
  useEffect(() => {
    if (!sectionParam || loading) return;
    const ref = sectionRefMap[sectionParam];
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionParam, loading]);

  // ── 食材履歴の取得（サジェスト用）──
  useEffect(() => {
    if (!individualId) return;
    const supabase = createClient();
    supabase
      .from('feedings')
      .select('food_type')
      .eq('individual_id', individualId)
      .not('food_type', 'is', null)
      .order('fed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const unique = [...new Set(data?.map((f) => f.food_type).filter(Boolean))] as string[];
        setFoodHistory(unique);
      });
  }, [individualId]);

  // ── サジェスト外側クリックで閉じる ──
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (suggestionWrapperRef.current && !suggestionWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ── 給餌レコード削除 ──
  async function handleDeleteFeeding(feedingId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('feedings').delete().eq('id', feedingId);
    if (!error) {
      setFeedingSummary((prev) => prev.filter((f) => f.id !== feedingId));
    }
  }

  // ── 保存処理 ──
  async function handleSave() {
    const hasFeeding = refused || (foodType.trim() !== '');
    const hasAny =
      condition !== null ||
      hasFeeding ||
      poop !== null ||
      urine !== null ||
      shed !== null ||
      (weight && parseFloat(weight) > 0) ||
      (length && parseFloat(length) > 0);

    if (!hasAny) return;
    if (!individualId || !dateParam) return;

    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return;
      }

      const userId = user.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ops: PromiseLike<any>[] = [];

      // ── helper: upsert / delete ──
      const upsertOrDelete = (
        table: string,
        existingId: string | null,
        hasValue: boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        insertData: Record<string, any>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateData: Record<string, any>,
      ) => {
        if (hasValue && existingId) {
          ops.push(supabase.from(table).update(updateData).eq('id', existingId).select());
        } else if (hasValue && !existingId) {
          ops.push(supabase.from(table).insert(insertData).select());
        } else if (!hasValue && existingId) {
          ops.push(supabase.from(table).delete().eq('id', existingId));
        }
      };

      // 0. 給餌 → feedings (INSERT only、既存はfeedingSummaryで管理)
      if (hasFeeding) {
        const dustingVal = supplements.calcium && supplements.vitamin
          ? 'calcium+vitamin'
          : supplements.calcium ? 'calcium'
          : supplements.vitamin ? 'vitamin'
          : null;
        const fedAt = dateParam
          ? `${dateParam}T${new Date().toTimeString().slice(0, 8)}`
          : new Date().toISOString();
        ops.push(
          supabase.from('feedings').insert({
            user_id: userId,
            individual_id: individualId,
            fed_at: fedAt,
            food_type: refused ? null : foodType.trim() || null,
            quantity: refused ? 0 : (feedQuantity ? parseFloat(feedQuantity) : 0),
            dusting: !refused && (supplements.calcium || supplements.vitamin),
            refused,
            notes: !refused && dustingVal ? dustingVal : '',
          }).select()
        );
      }

      // 1. 体調 → health_logs
      upsertOrDelete('health_logs', existingHealthLogId, !!condition,
        { user_id: userId, individual_id: individualId, logged_on: dateParam, condition, symptoms: [] },
        { condition },
      );

      // 2. 排泄 → care_logs (care_type='poop')
      upsertOrDelete('care_logs', existingCareLogIds['poop'] ?? null, !!poop,
        { user_id: userId, individual_id: individualId, logged_on: dateParam, care_type: 'poop', value: poop },
        { value: poop },
      );

      // 3. 尿酸 → care_logs (care_type='urine')
      upsertOrDelete('care_logs', existingCareLogIds['urine'] ?? null, !!urine,
        { user_id: userId, individual_id: individualId, logged_on: dateParam, care_type: 'urine', value: urine },
        { value: urine },
      );

      // 4. 脱皮 → sheds or care_logs
      if (shed === '白濁') {
        // care_logsに保存
        upsertOrDelete('care_logs', existingCareLogIds['shed'] ?? null, true,
          { user_id: userId, individual_id: individualId, logged_on: dateParam, care_type: 'shed', value: '白濁' },
          { value: '白濁' },
        );
        // shedsテーブルの既存レコードがあれば削除
        if (existingShedId) {
          ops.push(supabase.from('sheds').delete().eq('id', existingShedId));
        }
      } else if (shed === '脱皮完了' || shed === '不完全') {
        const completeness = shed === '脱皮完了' ? '完全' : '不完全';
        upsertOrDelete('sheds', existingShedId, true,
          { user_id: userId, individual_id: individualId, shed_on: dateParam, completeness },
          { completeness },
        );
        // care_logsのshed既存レコードがあれば削除
        if (existingCareLogIds['shed']) {
          ops.push(supabase.from('care_logs').delete().eq('id', existingCareLogIds['shed']));
        }
      } else {
        // 未選択 → 既存削除
        if (existingShedId) {
          ops.push(supabase.from('sheds').delete().eq('id', existingShedId));
        }
        if (existingCareLogIds['shed']) {
          ops.push(supabase.from('care_logs').delete().eq('id', existingCareLogIds['shed']));
        }
      }

      // 5. 体重・体長 → measurements
      const weightVal = weight ? parseFloat(weight) : null;
      const lengthVal = length ? parseFloat(length) : null;
      const hasMeasurement = !!((weightVal && weightVal > 0) || (lengthVal && lengthVal > 0));
      upsertOrDelete('measurements', existingMeasurementId, hasMeasurement,
        {
          user_id: userId, individual_id: individualId, measured_on: dateParam,
          weight_g: weightVal && weightVal > 0 ? weightVal : null,
          length_cm: lengthVal && lengthVal > 0 ? lengthVal : null,
        },
        {
          weight_g: weightVal && weightVal > 0 ? weightVal : null,
          length_cm: lengthVal && lengthVal > 0 ? lengthVal : null,
        },
      );

      const results = await Promise.all(ops);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = results.filter((r: any) => r?.error);
      if (errors.length > 0) {
        console.error('Save errors:', errors.map((e: any) => e.error));
      }

      router.back();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }

  // ── 描画 ──
  return (
    <div className="bg-[#0F172A] min-h-dvh">
      {/* ═══ ヘッダー ═══ */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#334155]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">記録の追加</h1>
            <p className="text-sm text-slate-400 mt-0.5">{formatDisplayDate(dateParam)}</p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ═══ ローディング ═══ */}
      {loading ? (
        <div className="px-5 py-16 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* ═══ セクション一覧 ═══ */
        <div className="px-5 py-6 space-y-8 pb-28">

          {/* ── 1. 体調 ── */}
          <section ref={conditionRef}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4">体調</h3>
            <div className="grid grid-cols-3 gap-3">
              {CONDITION_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = condition === item.dbValue;
                return (
                  <button
                    key={item.dbValue}
                    type="button"
                    onClick={() => setCondition(isSelected ? null : item.dbValue)}
                    className={`h-28 rounded-2xl border flex flex-col items-center justify-center p-4 transition-all duration-300
                      ${isSelected
                        ? 'border-[#10B981] bg-[#10B981]/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'bg-[#1E293B] border-[#334155] hover:border-[#10B981]/50'
                      }`}
                  >
                    <Icon className={`w-10 h-10 ${isSelected ? 'text-[#10B981]' : 'text-slate-400'}`} />
                    <span className={`text-sm mt-2 ${isSelected ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 2. 給餌（インライン入力）── */}
          <section ref={feedingRef} id="feeding-section">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4">給餌</h3>

            {/* 拒食チェック */}
            <button
              type="button"
              onClick={() => setRefused((v) => !v)}
              className={`w-full py-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 transition-all mb-3
                ${refused
                  ? 'border-red-500/30 bg-red-500/10 text-red-400 font-bold'
                  : 'bg-[#1E293B] border-[#334155] text-slate-400'
                }`}
            >
              {refused && <Ban className="w-4 h-4" />}
              拒食
            </button>

            {/* 入力エリア（拒食時グレーアウト）*/}
            <div className={refused ? 'opacity-30 pointer-events-none' : ''}>
              {/* 餌の種類（サジェスト付き）*/}
              <div className="relative" ref={suggestionWrapperRef}>
                <div className="relative group">
                  <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#10B981] transition-colors" />
                  <input
                    type="text"
                    value={foodType}
                    onChange={(e) => { setFoodType(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="餌の種類を入力..."
                    className="w-full py-3 pl-10 pr-4 bg-[#1E293B] border border-[#334155] rounded-xl text-slate-100 placeholder:text-slate-600 focus:border-[#10B981] focus:ring-0 outline-none text-sm"
                  />
                </div>
                {/* サジェストドロップダウン */}
                {showSuggestions && (() => {
                  const filtered = foodType.trim()
                    ? foodHistory.filter((f) => f.toLowerCase().includes(foodType.toLowerCase()))
                    : foodHistory.slice(0, 5);
                  if (filtered.length === 0) return null;
                  return (
                    <div className="absolute z-10 w-full mt-1 bg-[#1E293B] border border-[#334155] rounded-xl shadow-lg overflow-hidden">
                      {filtered.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => { setFoodType(item); setShowSuggestions(false); }}
                          className="w-full px-4 py-3 hover:bg-white/5 text-sm text-slate-200 text-left border-b border-[#334155] last:border-none"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 数量 + 単位切替 */}
              <div className="flex gap-3 mt-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={feedQuantity}
                  onChange={(e) => setFeedQuantity(e.target.value)}
                  placeholder="0"
                  className="flex-1 py-3 px-4 bg-[#1E293B] border border-[#334155] rounded-xl text-slate-100 placeholder:text-slate-600 focus:border-[#10B981] focus:ring-0 outline-none text-sm"
                />
                <div className="flex bg-[#1E293B] border border-[#334155] p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFeedUnit('個')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                      feedUnit === '個' ? 'bg-white/10 text-[#10B981] font-bold' : 'text-slate-400 font-medium'
                    }`}
                  >
                    個
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedUnit('g')}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                      feedUnit === 'g' ? 'bg-white/10 text-[#10B981] font-bold' : 'text-slate-400 font-medium'
                    }`}
                  >
                    g
                  </button>
                </div>
              </div>

              {/* サプリメント */}
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setSupplements((s) => ({ ...s, calcium: !s.calcium }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm flex items-center justify-center gap-1.5 transition-all
                    ${supplements.calcium
                      ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] font-bold'
                      : 'bg-[#1E293B] border-[#334155] text-slate-400 font-medium'
                    }`}
                >
                  {supplements.calcium && <Check className="w-4 h-4" />}
                  カルシウム
                </button>
                <button
                  type="button"
                  onClick={() => setSupplements((s) => ({ ...s, vitamin: !s.vitamin }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm flex items-center justify-center gap-1.5 transition-all
                    ${supplements.vitamin
                      ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] font-bold'
                      : 'bg-[#1E293B] border-[#334155] text-slate-400 font-medium'
                    }`}
                >
                  {supplements.vitamin && <Check className="w-4 h-4" />}
                  ビタミン
                </button>
              </div>
            </div>

            {/* 既存の給餌レコード */}
            {feedingSummary.length > 0 && (
              <div className="flex items-center flex-wrap gap-2 mt-4">
                {feedingSummary.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-slate-300"
                  >
                    {f.food_type} | {f.quantity}
                    <button
                      type="button"
                      onClick={() => handleDeleteFeeding(f.id)}
                      className="ml-2 text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ── 3. 排泄 ── */}
          <section ref={poopRef}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4">排泄</h3>
            <div className="grid grid-cols-3 gap-3">
              {POOP_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = poop === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPoop(isSelected ? null : item.value)}
                    className={`h-24 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300
                      ${isSelected
                        ? 'border-[#10B981] bg-[#10B981]/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : `bg-[#1E293B] border-[#334155] ${item.hoverDanger ? 'hover:border-red-500/50' : 'hover:border-[#10B981]/50'}`
                      }`}
                  >
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-[#10B981]' : 'text-slate-400'}`} />
                    <span className={`text-sm mt-1.5 ${isSelected ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 4. 尿酸 ── */}
          <section ref={urineRef}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4">尿酸</h3>
            <div className="grid grid-cols-3 gap-3">
              {URINE_OPTIONS.map((item) => {
                const isSelected = urine === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setUrine(isSelected ? null : item.value)}
                    className={`h-24 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300
                      ${isSelected
                        ? 'border-[#10B981] bg-[#10B981]/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : `bg-[#1E293B] border-[#334155] ${item.type === 'none' ? 'hover:border-red-500/50' : 'hover:border-[#10B981]/50'}`
                      }`}
                  >
                    {item.type === 'white' && (
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-white" />
                    )}
                    {item.type === 'yellow' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-400" />
                    )}
                    {item.type === 'none' && (
                      <Ban className={`w-8 h-8 ${isSelected ? 'text-[#10B981]' : 'text-slate-400'}`} />
                    )}
                    <span className={`text-sm mt-1.5 ${isSelected ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 5. 脱皮 ── */}
          <section ref={sheddingRef}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4">脱皮</h3>
            <div className="grid grid-cols-3 gap-3">
              {SHED_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = shed === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setShed(isSelected ? null : item.value)}
                    className={`h-24 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300
                      ${isSelected
                        ? 'border-[#10B981] bg-[#10B981]/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : `bg-[#1E293B] border-[#334155] ${item.hoverClass}`
                      }`}
                  >
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-[#10B981]' : 'text-slate-400'}`} />
                    <span className={`text-sm mt-1.5 ${isSelected ? 'text-[#10B981] font-bold' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 6. 体重・体長 ── */}
          <section ref={weightRef}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1 mb-4">体重・体長</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* 体重 */}
              <div className="relative group">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#10B981] transition-colors" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.0"
                  className="w-full pl-10 pr-12 py-3 bg-transparent border-0 border-b-2 border-[#334155] focus:border-[#10B981] focus:ring-0 text-slate-100 font-medium placeholder:text-slate-600 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">g</span>
              </div>
              {/* 体長 */}
              <div className="relative group">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#10B981] transition-colors" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="0.0"
                  className="w-full pl-10 pr-12 py-3 bg-transparent border-0 border-b-2 border-[#334155] focus:border-[#10B981] focus:ring-0 text-slate-100 font-medium placeholder:text-slate-600 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">cm</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══ 保存FAB ═══ */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#10B981] rounded-full shadow-lg shadow-[#10B981]/40 flex items-center justify-center hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Check className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}

// ── ページエクスポート（Suspense境界） ────────────────

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh bg-[#0F172A] text-slate-400">
          読み込み中...
        </div>
      }
    >
      <RecordPageContent />
    </Suspense>
  );
}
