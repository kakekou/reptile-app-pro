"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Utensils,
  Droplets,
  Trash2,
  Layers,
  Scale,
  Heart,
  Hand,
  Pill,
  HeartHandshake,
  Egg,
  FileText,
  Camera,
  GlassWater,
  Bug,
  Locate,
  Worm,
  Mouse,
  Bird,
  FlaskConical,
  Plus,
  X,
  Minus,
  Check,
  Bath,
  Hospital,
  Brush,
  Thermometer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── 型定義 ──────────────────────────────────────────────

type CareType =
  | "condition"
  | "feeding"
  | "poop"
  | "urine"
  | "cleaning"
  | "bathing"
  | "handling"
  | "water_change"
  | "medication"
  | "hospital"
  | "mating"
  | "egg_laying"
  | "shedding"
  | "weight"
  | "memo"
  | "photo";

interface CareItem {
  type: CareType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  dotBg: string;
}

interface IndividualTab {
  id: string;
  name: string;
  species: string;
}

interface CareEvent {
  type: CareType;
  date: string; // "YYYY-MM-DD"
  foodType?: string;
  dusting?: boolean;
  condition?: string;
  weight_g?: number;
}

interface FeedingInput {
  foodType: string;
  quantity: number;
  dusting: boolean;
  refused: boolean;
}

// ── 定数 ──────────────────────────────────────────────

const CARE_ITEMS: CareItem[] = [
  { type: "feeding",      label: "給餌",       icon: Utensils,       color: "text-orange-500",  bg: "bg-orange-500/15",  dotBg: "bg-orange-500" },
  { type: "water_change", label: "水替",       icon: Droplets,       color: "text-blue-500",    bg: "bg-blue-500/15",    dotBg: "bg-blue-500" },
  { type: "poop",         label: "排泄",       icon: Trash2,         color: "text-amber-600",   bg: "bg-amber-500/15",   dotBg: "bg-amber-600" },
  { type: "shedding",     label: "脱皮",       icon: Layers,         color: "text-purple-500",  bg: "bg-purple-500/15",  dotBg: "bg-purple-500" },
  { type: "cleaning",     label: "掃除",       icon: Brush,          color: "text-teal-500",    bg: "bg-teal-500/15",    dotBg: "bg-teal-500" },
  { type: "weight",       label: "体重",       icon: Scale,          color: "text-slate-400",   bg: "bg-slate-500/15",   dotBg: "bg-slate-500" },
  { type: "bathing",      label: "温浴",       icon: Bath,           color: "text-red-500",     bg: "bg-red-500/15",     dotBg: "bg-red-500" },
  { type: "condition",    label: "体調",       icon: Heart,          color: "text-rose-500",    bg: "bg-rose-500/15",    dotBg: "bg-rose-500" },
  { type: "urine",        label: "尿酸",       icon: GlassWater,     color: "text-yellow-500",  bg: "bg-yellow-500/15",  dotBg: "bg-yellow-500" },
  { type: "handling",     label: "ﾊﾝﾄﾞﾘﾝｸﾞ",  icon: Hand,           color: "text-fuchsia-500", bg: "bg-fuchsia-500/15", dotBg: "bg-fuchsia-500" },
  { type: "medication",   label: "投薬",       icon: Pill,           color: "text-red-600",     bg: "bg-red-500/15",     dotBg: "bg-red-600" },
  { type: "hospital",     label: "通院",       icon: Hospital,       color: "text-rose-600",    bg: "bg-rose-500/15",    dotBg: "bg-rose-600" },
  { type: "mating",       label: "交尾",       icon: HeartHandshake, color: "text-pink-500",    bg: "bg-pink-500/15",    dotBg: "bg-pink-500" },
  { type: "egg_laying",   label: "産卵",       icon: Egg,            color: "text-yellow-600",  bg: "bg-yellow-500/15",  dotBg: "bg-yellow-600" },
  { type: "memo",         label: "メモ",       icon: FileText,       color: "text-gray-400",    bg: "bg-gray-500/15",    dotBg: "bg-gray-500" },
  { type: "photo",        label: "写真",       icon: Camera,         color: "text-sky-500",     bg: "bg-sky-500/15",     dotBg: "bg-sky-500" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const CONDITION_LEVELS = [
  { value: "絶好調", label: "好調", emoji: "😊", color: "text-emerald-400", border: "border-emerald-500/50", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30" },
  { value: "普通",   label: "普通", emoji: "😐", color: "text-slate-400",   border: "border-slate-500/50",   bg: "bg-slate-500/15",   ring: "ring-slate-500/30" },
  { value: "不調",   label: "不調", emoji: "😞", color: "text-red-400",     border: "border-red-500/50",     bg: "bg-red-500/15",     ring: "ring-red-500/30" },
];

const CONDITION_MAP: Record<string, string> = Object.fromEntries(
  CONDITION_LEVELS.map((c) => [c.value, c.value])
);
// 旧5段階の後方互換マッピング
CONDITION_MAP["好調"] = "絶好調";
CONDITION_MAP["絶不調"] = "不調";

function mapConditionValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return CONDITION_MAP[raw] ?? null;
}

const FOOD_OPTIONS = [
  { key: "コオロギ",     icon: Bug,          color: "text-amber-700",  bg: "bg-amber-50" },
  { key: "デュビア",     icon: Locate,       color: "text-red-700",    bg: "bg-red-50" },
  { key: "ミルワーム",   icon: Worm,         color: "text-yellow-600", bg: "bg-yellow-50" },
  { key: "ピンクマウス", icon: Mouse,        color: "text-pink-500",   bg: "bg-pink-50" },
  { key: "ヒヨコ",       icon: Bird,         color: "text-orange-400", bg: "bg-orange-50" },
  { key: "卵",           icon: Egg,          color: "text-amber-400",  bg: "bg-amber-50" },
  { key: "人工フード",   icon: FlaskConical, color: "text-blue-600",   bg: "bg-blue-50" },
  { key: "その他",       icon: Plus,         color: "text-gray-500",   bg: "bg-gray-50" },
];

const CARE_TOGGLE_ITEMS = [
  { key: "cleaning",     label: "掃除",       icon: Brush,          color: "text-teal-400",    bg: "bg-teal-500/15" },
  { key: "bathing",      label: "温浴",       icon: Bath,           color: "text-red-400",     bg: "bg-red-500/15" },
  { key: "handling",     label: "ﾊﾝﾄﾞﾘﾝｸﾞ",  icon: Hand,           color: "text-fuchsia-400", bg: "bg-fuchsia-500/15" },
  { key: "water_change", label: "水替え",     icon: Droplets,       color: "text-blue-400",    bg: "bg-blue-500/15" },
  { key: "medication",   label: "投薬",       icon: Pill,           color: "text-red-400",     bg: "bg-red-500/15" },
  { key: "hospital",     label: "通院",       icon: Hospital,       color: "text-rose-400",    bg: "bg-rose-500/15" },
  { key: "mating",       label: "交尾",       icon: HeartHandshake, color: "text-pink-400",    bg: "bg-pink-500/15" },
  { key: "egg_laying",   label: "産卵",       icon: Egg,            color: "text-yellow-400",  bg: "bg-yellow-500/15" },
];

// ── ユーティリティ関数 ─────────────────────────────────

function formatDateToString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekDates(weekOffset: number): string[] {
  const today = new Date();
  today.setDate(today.getDate() + weekOffset * 7);

  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateToString(d));
  }
  return dates;
}

function formatDate(dateStr: string): { day: number; weekday: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    day: date.getDate(),
    weekday: WEEKDAYS[date.getDay()],
  };
}

function getTodayString(): string {
  return formatDateToString(new Date());
}

function getISOWeekNumber(date: Date): number {
  const tmp = new Date(date.getTime());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const firstThursday = new Date(tmp.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const diff = tmp.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

function getMonthRange(monthOffset: number): { startDate: string; endDate: string; year: number; month: number } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    startDate: formatDateToString(firstDay),
    endDate: formatDateToString(lastDay),
    year,
    month: month + 1,
  };
}

function getMonthCalendarDates(monthOffset: number): (string | null)[][] {
  const { year, month } = getMonthRange(monthOffset);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startWeekday = firstDay.getDay();

  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = [];

  for (let i = 0; i < startWeekday; i++) {
    currentWeek.push(null);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    currentWeek.push(dateStr);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function formatModalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日(${WEEKDAYS[date.getDay()]})`;
}

function getSpeciesEmoji(species: string): string {
  if (species.includes("ヘビ")) return "🐍";
  return "🦎";
}

// ── イベント正規化（共通） ──────────────────────────────

function normalizeEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feedData: any[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shedData: any[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  measData: any[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  healthData: any[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  careData: any[] | null,
): CareEvent[] {
  const feedEvents: CareEvent[] = (feedData ?? []).map((f) => ({
    type: "feeding" as CareType,
    date: f.fed_at.slice(0, 10),
    foodType: f.food_type,
  }));

  const shedEvents: CareEvent[] = (shedData ?? []).map((s) => ({
    type: "shedding" as CareType,
    date: s.shed_on.slice(0, 10),
  }));

  const measEvents: CareEvent[] = (measData ?? []).map((m) => ({
    type: "weight" as CareType,
    date: m.measured_on.slice(0, 10),
    weight_g: m.weight_g,
  }));

  const healthEvents: CareEvent[] = (healthData ?? []).map((h) => ({
    type: "condition" as CareType,
    date: h.logged_on.slice(0, 10),
    condition: mapConditionValue(h.condition) ?? "普通",
  }));

  const careLogEvents: CareEvent[] = (careData ?? []).map((c) => ({
    type: c.care_type as CareType,
    date: c.logged_on.slice(0, 10),
  }));

  return [...feedEvents, ...shedEvents, ...measEvents, ...healthEvents, ...careLogEvents];
}

// ── 月表示用ドット描画 ──────────────────────────────

function renderMonthCellDots(dayEvents: CareEvent[]) {
  if (dayEvents.length === 0) return null;

  const uniqueTypes = CARE_ITEMS
    .filter((care) => dayEvents.some((e) => e.type === care.type))
    .slice(0, 5);

  return uniqueTypes.map((care) => (
    <div
      key={care.type}
      className={`w-1.5 h-1.5 rounded-full ${care.dotBg}`}
    />
  ));
}

// ── ページコンポーネント ───────────────────────────────

export default function WeeklyCareMatrixPage() {
  const [individuals, setIndividuals] = useState<IndividualTab[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // ── モーダル用ステート ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [conditionInput, setConditionInput] = useState<string | null>(null);
  const [feedingInputs, setFeedingInputs] = useState<FeedingInput[]>([]);
  const [poopInput, setPoopInput] = useState<string | null>(null);
  const [urineInput, setUrineInput] = useState<string | null>(null);
  const [shedInput, setShedInput] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [lengthInput, setLengthInput] = useState("");
  const [toggleCares, setToggleCares] = useState<Record<string, boolean>>({});
  const [memoInput, setMemoInput] = useState("");
  const [refetchCount, setRefetchCount] = useState(0);

  // ── 既存レコードID（編集/削除用） ──
  const [existingHealthLogId, setExistingHealthLogId] = useState<string | null>(null);
  const [existingFeedingIds, setExistingFeedingIds] = useState<string[]>([]);
  const [existingShedId, setExistingShedId] = useState<string | null>(null);
  const [existingMeasurementId, setExistingMeasurementId] = useState<string | null>(null);
  const [existingCareLogIds, setExistingCareLogIds] = useState<Record<string, string>>({});
  const [modalLoading, setModalLoading] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const todayString = getTodayString();

  const today = new Date();
  const todayDisplay = `${today.getMonth() + 1}月${today.getDate()}日(${WEEKDAYS[today.getDay()]})`;

  const thursdayParts = weekDates[3].split("-").map(Number);
  const weekNumber = getISOWeekNumber(new Date(thursdayParts[0], thursdayParts[1] - 1, thursdayParts[2]));

  const { year: displayYear, month: displayMonth } = getMonthRange(monthOffset);
  const monthCalendarDates = getMonthCalendarDates(monthOffset);

  // ── モーダル関数 ──
  function resetAllInputs() {
    setConditionInput(null);
    setFeedingInputs([]);
    setPoopInput(null);
    setUrineInput(null);
    setShedInput(null);
    setWeightInput("");
    setLengthInput("");
    setToggleCares({});
    setMemoInput("");
    setExistingHealthLogId(null);
    setExistingFeedingIds([]);
    setExistingShedId(null);
    setExistingMeasurementId(null);
    setExistingCareLogIds({});
  }

  async function openModal(date: string) {
    resetAllInputs();
    setModalDate(date);
    setModalOpen(true);
    if (!selectedId) return;

    setModalLoading(true);
    const supabase = createClient();

    const [healthRes, feedRes, careRes, shedRes, measRes] = await Promise.all([
      supabase.from('health_logs').select('id, condition')
        .eq('individual_id', selectedId).eq('logged_on', date).limit(1),
      supabase.from('feedings').select('id, food_type, quantity, refused')
        .eq('individual_id', selectedId)
        .gte('fed_at', date + 'T00:00:00').lte('fed_at', date + 'T23:59:59'),
      supabase.from('care_logs').select('id, care_type, value')
        .eq('individual_id', selectedId).eq('logged_on', date),
      supabase.from('sheds').select('id, completeness')
        .eq('individual_id', selectedId).eq('shed_on', date).limit(1),
      supabase.from('measurements').select('id, weight_g, length_cm')
        .eq('individual_id', selectedId).eq('measured_on', date).limit(1),
    ]);

    // health_logs
    if (healthRes.data?.[0]) {
      setConditionInput(mapConditionValue(healthRes.data[0].condition));
      setExistingHealthLogId(healthRes.data[0].id);
    }

    // feedings
    if (feedRes.data && feedRes.data.length > 0) {
      setFeedingInputs(feedRes.data.map((f: any) => ({
        foodType: f.food_type,
        quantity: f.quantity ?? 1,
        dusting: false,
        refused: f.refused ?? false,
      })));
      setExistingFeedingIds(feedRes.data.map((f: any) => f.id));
    }

    // care_logs
    const careIdMap: Record<string, string> = {};
    const toggleMap: Record<string, boolean> = {};
    if (careRes.data) {
      for (const c of careRes.data) {
        careIdMap[c.care_type] = c.id;
        if (c.care_type === 'poop') setPoopInput(c.value);
        else if (c.care_type === 'urine') setUrineInput(c.value);
        else if (c.care_type === 'memo') { setMemoInput(c.value ?? ''); toggleMap['memo'] = true; }
        else toggleMap[c.care_type] = true;
      }
    }
    setExistingCareLogIds(careIdMap);
    setToggleCares(toggleMap);

    // sheds
    if (shedRes.data?.[0]) {
      setShedInput(shedRes.data[0].completeness === '完全' ? '脱皮完了' : '不完全');
      setExistingShedId(shedRes.data[0].id);
    }

    // measurements
    if (measRes.data?.[0]) {
      if (measRes.data[0].weight_g) setWeightInput(String(measRes.data[0].weight_g));
      if (measRes.data[0].length_cm) setLengthInput(String(measRes.data[0].length_cm));
      setExistingMeasurementId(measRes.data[0].id);
    }

    setModalLoading(false);
  }

  const handleSave = async () => {
    if (!selectedId || !modalDate) return;
    setSaving(true);

    // ── 楽観的UI更新: 入力値からeventsを即座に構築 ──
    const previousEvents = [...events];
    const newDayEvents: CareEvent[] = [];
    if (conditionInput) newDayEvents.push({ type: 'condition', date: modalDate, condition: conditionInput });
    for (const fi of feedingInputs) {
      newDayEvents.push({ type: 'feeding', date: modalDate, foodType: fi.foodType });
    }
    if (poopInput) newDayEvents.push({ type: 'poop', date: modalDate });
    if (urineInput) newDayEvents.push({ type: 'urine', date: modalDate });
    if (shedInput) newDayEvents.push({ type: 'shedding', date: modalDate });
    if (weightInput && parseFloat(weightInput) > 0) {
      newDayEvents.push({ type: 'weight', date: modalDate, weight_g: parseFloat(weightInput) });
    }
    for (const [ct, isOn] of Object.entries(toggleCares)) {
      if (isOn) newDayEvents.push({ type: ct as CareType, date: modalDate });
    }
    if (memoInput && !toggleCares['memo']) {
      newDayEvents.push({ type: 'memo', date: modalDate });
    }

    // この日のeventsを差し替え
    setEvents(prev => [...prev.filter(e => e.date !== modalDate), ...newDayEvents]);
    setModalOpen(false);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { console.error('Save error: not authenticated'); setEvents(previousEvents); return; }
      const userId = user.id;
      const ops: PromiseLike<any>[] = [];

      // ── helper: upsert / delete ──
      const upsertOrDelete = (
        table: string,
        existingId: string | null,
        hasValue: boolean,
        insertData: Record<string, any>,
        updateData: Record<string, any>,
      ) => {
        if (hasValue && existingId) {
          ops.push(supabase.from(table).update(updateData).eq('id', existingId).select().then(r => r));
        } else if (hasValue && !existingId) {
          ops.push(supabase.from(table).insert(insertData).select().then(r => r));
        } else if (!hasValue && existingId) {
          ops.push(supabase.from(table).delete().eq('id', existingId).then(r => r));
        }
      };

      // 1. 調子 → health_logs
      upsertOrDelete('health_logs', existingHealthLogId, !!conditionInput,
        { user_id: userId, individual_id: selectedId, logged_on: modalDate, condition: conditionInput, symptoms: [] },
        { condition: conditionInput },
      );

      // 2. 給餌は専用ページ（/feeding）で管理

      // 3. 脱皮 → sheds
      const shedComp = shedInput === '脱皮完了' ? '完全' : shedInput === '不完全' ? '不完全' : '完全';
      upsertOrDelete('sheds', existingShedId, !!shedInput,
        { user_id: userId, individual_id: selectedId, shed_on: modalDate, completeness: shedComp },
        { completeness: shedComp },
      );

      // 4. 体重・体長 → measurements（両方空なら DELETE）
      const hasMeasurement = !!(
        (weightInput && parseFloat(weightInput) > 0) ||
        (lengthInput && parseFloat(lengthInput) > 0)
      );
      upsertOrDelete('measurements', existingMeasurementId, hasMeasurement,
        { user_id: userId, individual_id: selectedId, measured_on: modalDate,
          weight_g: weightInput ? parseFloat(weightInput) : null,
          length_cm: lengthInput ? parseFloat(lengthInput) : null },
        { weight_g: weightInput ? parseFloat(weightInput) : null,
          length_cm: lengthInput ? parseFloat(lengthInput) : null },
      );

      // 5. care_logs: フン・尿・トグル系ケア・メモ
      const careTypes = ['poop', 'urine', ...CARE_TOGGLE_ITEMS.map(i => i.key), 'memo'];
      for (const ct of careTypes) {
        let hasValue = false;
        let value: string | null = null;
        if (ct === 'poop') { hasValue = !!poopInput; value = poopInput; }
        else if (ct === 'urine') { hasValue = !!urineInput; value = urineInput; }
        else if (ct === 'memo') { hasValue = !!memoInput; value = memoInput; }
        else { hasValue = !!toggleCares[ct]; }

        upsertOrDelete('care_logs', existingCareLogIds[ct] ?? null, hasValue,
          { user_id: userId, individual_id: selectedId, logged_on: modalDate, care_type: ct, value },
          { value },
        );
      }

      const results = await Promise.all(ops);
      const errors = results.filter(r => r?.error);
      if (errors.length > 0) {
        console.error('Save errors:', errors.map(e => e.error));
        // エラー時はロールバックして再fetch
        setEvents(previousEvents);
        setRefetchCount(c => c + 1);
      }

    } catch (error) {
      console.error('Save error:', error);
      setEvents(previousEvents);
      setRefetchCount(c => c + 1);
    } finally {
      resetAllInputs();
      setSaving(false);
    }
  };

  // Effect 1: 個体一覧の取得（マウント時1回）
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("individuals")
      .select("id, name, species, image_url")
      .eq("status", "飼育中")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch individuals:", error);
          setLoading(false);
          return;
        }
        const list: IndividualTab[] = (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          species: row.species,
        }));
        setIndividuals(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        }
        setLoading(false);
      });
  }, []);

  // Effect 2: 週間ケア記録の取得
  useEffect(() => {
    if (viewMode !== "week" || !selectedId) return;

    const supabase = createClient();
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    Promise.all([
      supabase.from("feedings").select("id, fed_at, food_type")
        .eq("individual_id", selectedId)
        .gte("fed_at", startDate + "T00:00:00").lte("fed_at", endDate + "T23:59:59"),
      supabase.from("sheds").select("id, shed_on")
        .eq("individual_id", selectedId)
        .gte("shed_on", startDate).lte("shed_on", endDate),
      supabase.from("measurements").select("id, measured_on, weight_g")
        .eq("individual_id", selectedId)
        .gte("measured_on", startDate).lte("measured_on", endDate),
      supabase.from("health_logs").select("id, logged_on, condition")
        .eq("individual_id", selectedId)
        .gte("logged_on", startDate).lte("logged_on", endDate),
      supabase.from("care_logs").select("id, care_type, logged_on")
        .eq("individual_id", selectedId)
        .gte("logged_on", startDate).lte("logged_on", endDate),
    ]).then(([feedRes, shedRes, measRes, healthRes, careRes]) => {
      if (feedRes.error) console.error("Failed to fetch feedings:", feedRes.error);
      if (shedRes.error) console.error("Failed to fetch sheds:", shedRes.error);
      if (measRes.error) console.error("Failed to fetch measurements:", measRes.error);
      if (healthRes.error) console.error("Failed to fetch health_logs:", healthRes.error);
      if (careRes.error) console.error("Failed to fetch care_logs:", careRes.error);

      setEvents(normalizeEvents(feedRes.data, shedRes.data, measRes.data, healthRes.data, careRes.data));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedId, weekOffset, refetchCount]);

  // Effect 3: 月間ケア記録の取得
  useEffect(() => {
    if (viewMode !== "month" || !selectedId) return;

    const { startDate, endDate } = getMonthRange(monthOffset);
    const supabase = createClient();

    Promise.all([
      supabase.from("feedings").select("id, fed_at, food_type")
        .eq("individual_id", selectedId)
        .gte("fed_at", startDate + "T00:00:00").lte("fed_at", endDate + "T23:59:59"),
      supabase.from("sheds").select("id, shed_on")
        .eq("individual_id", selectedId)
        .gte("shed_on", startDate).lte("shed_on", endDate),
      supabase.from("measurements").select("id, measured_on, weight_g")
        .eq("individual_id", selectedId)
        .gte("measured_on", startDate).lte("measured_on", endDate),
      supabase.from("health_logs").select("id, logged_on, condition")
        .eq("individual_id", selectedId)
        .gte("logged_on", startDate).lte("logged_on", endDate),
      supabase.from("care_logs").select("id, care_type, logged_on")
        .eq("individual_id", selectedId)
        .gte("logged_on", startDate).lte("logged_on", endDate),
    ]).then(([feedRes, shedRes, measRes, healthRes, careRes]) => {
      if (feedRes.error) console.error("Failed to fetch feedings:", feedRes.error);
      if (shedRes.error) console.error("Failed to fetch sheds:", shedRes.error);
      if (measRes.error) console.error("Failed to fetch measurements:", measRes.error);
      if (healthRes.error) console.error("Failed to fetch health_logs:", healthRes.error);
      if (careRes.error) console.error("Failed to fetch care_logs:", careRes.error);

      setEvents(normalizeEvents(feedRes.data, shedRes.data, measRes.data, healthRes.data, careRes.data));
    });
  }, [viewMode, selectedId, monthOffset, refetchCount]);

  return (
    <>
    <div className="bg-[#0F172A] min-h-screen text-white relative overflow-hidden">
      {/* ═══ アンビエント・グロー ═══ */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ═══ A. ヘッダー ═══ */}
      <header className="sticky top-0 z-10 bg-[#0F172A]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ReptiLog 🦎
            </h1>
            <p className="text-sm text-primary">{todayDisplay}</p>
          </div>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pb-6">
        {/* ═══ B. 個体切り替えタブ ═══ */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {loading ? (
            <>
              <div className="h-10 animate-pulse bg-[#1E293B] rounded-full w-28" />
              <div className="h-10 animate-pulse bg-[#1E293B] rounded-full w-28" />
              <div className="h-10 animate-pulse bg-[#1E293B] rounded-full w-28" />
            </>
          ) : individuals.length === 0 ? (
            <p className="text-sm text-slate-500">
              個体を登録してください →{" "}
              <Link href="/individuals/new" className="text-primary font-medium hover:underline">
                個体一覧
              </Link>
            </p>
          ) : (
            individuals.map((ind) => {
              const isSelected = ind.id === selectedId;
              const emoji = getSpeciesEmoji(ind.species);
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedId(ind.id)}
                  className={`
                    flex items-center gap-1.5 px-5 py-2.5 rounded-full
                    whitespace-nowrap transition-all
                    ${
                      isSelected
                        ? "bg-primary/15 text-primary border border-primary font-bold shadow-lg shadow-primary/10"
                        : "bg-[#1E293B]/50 text-slate-400 border border-white/5 font-medium"
                    }
                  `}
                >
                  <span>{emoji}</span>
                  <span>{ind.name}</span>
                </button>
              );
            })
          )}
        </div>

        {/* ═══ Quick Stats (static mock) ═══ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Thermometer className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xs font-bold text-slate-400">Temp Alert</span>
            </div>
            <p className="text-2xl font-black text-white">27.5°C</p>
            <p className="text-[10px] text-slate-500 mt-0.5">適温範囲内</p>
          </div>
          <div className="bg-[#1E293B]/70 backdrop-blur-[12px] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                <Egg className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-xs font-bold text-slate-400">Hatching</span>
            </div>
            <p className="text-2xl font-black text-white">3 eggs</p>
            <p className="text-[10px] text-slate-500 mt-0.5">残り14日 (予定)</p>
          </div>
        </div>

        {/* ═══ C. 週/月トグル ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {viewMode === "week" ? "ウィークリー" : "マンスリー"}
            </h2>
            <span className="text-sm text-slate-500">
              {viewMode === "week"
                ? `${today.getMonth() + 1}月`
                : `${displayYear}年 ${displayMonth}月`}
            </span>
          </div>
          <div className="bg-[#1E293B] p-1 rounded-lg flex border border-white/5">
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-1 text-xs rounded transition-all ${
                viewMode === "week"
                  ? "bg-[#334155] text-white shadow-sm font-semibold"
                  : "text-slate-500 font-medium"
              }`}
            >
              週
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-1 text-xs rounded transition-all ${
                viewMode === "month"
                  ? "bg-[#334155] text-white shadow-sm font-semibold"
                  : "text-slate-500 font-medium"
              }`}
            >
              月
            </button>
          </div>
        </div>

        {/* ═══ D. マトリクス / カレンダー ═══ */}
        {loading ? (
          <div className="bg-[#1E293B]/70 backdrop-blur-[12px] rounded-2xl border border-white/5 p-4 space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-8 bg-[#0F172A]/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : individuals.length === 0 ? (
          <div className="bg-[#1E293B]/70 backdrop-blur-[12px] rounded-2xl border border-white/5 p-8 text-center">
            <p className="text-slate-500 text-sm">個体が登録されていません</p>
            <Link
              href="/individuals/new"
              className="text-primary text-sm font-medium mt-2 inline-block hover:underline"
            >
              ＋ 個体を登録する
            </Link>
          </div>
        ) : viewMode === "week" ? (
          /* ─── D-1. 週間マトリクスカード ─── */
          <div className="bg-[#1E293B]/70 backdrop-blur-[12px] rounded-2xl p-4 border border-white/5">
            {/* ナビゲーション */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-400">
                  第{weekNumber}週
                </span>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="text-xs text-primary font-medium px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
                  >
                    今日
                  </button>
                )}
              </div>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 週間グリッド */}
            <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-y-5 gap-x-1">
              {/* 曜日ヘッダー行 */}
              <div /> {/* 左上の空セル */}
              {weekDates.map((date) => {
                const { day, weekday } = formatDate(date);
                const isToday = date === todayString;
                const dayIndex = new Date(date + "T00:00:00").getDay();
                return (
                  <div
                    key={date}
                    className={`flex flex-col items-center gap-0.5 py-1 ${
                      isToday ? "bg-primary/5 rounded-t-xl" : ""
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        dayIndex === 0 ? "text-primary" : "text-slate-500"
                      }`}
                    >
                      {weekday}
                    </span>
                    {isToday ? (
                      <span className="w-6 h-6 flex items-center justify-center bg-primary text-white rounded-full text-xs font-semibold">
                        {day}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-300">
                        {day}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* ケア項目行 */}
              {CARE_ITEMS.map((care, careIndex) => {
                const Icon = care.icon;
                const isLastRow = careIndex === CARE_ITEMS.length - 1;
                return (
                  <Fragment key={care.type}>
                    {/* ラベルセル */}
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <div
                        className={`w-7 h-7 rounded-full ${care.bg} flex items-center justify-center`}
                      >
                        <Icon className={`w-[15px] h-[15px] ${care.color}`} />
                      </div>
                      <span className="text-[9px] font-medium text-slate-500 leading-tight">
                        {care.label}
                      </span>
                    </div>

                    {/* 7つのデータセル */}
                    {weekDates.map((date) => {
                      const isToday = date === todayString;
                      const dayEvents = events.filter(
                        (e) => e.type === care.type && e.date === date
                      );
                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => openModal(date)}
                          className={`h-8 flex items-center justify-center touch-manipulation ${
                            isToday
                              ? `bg-primary/5 ${isLastRow ? "rounded-b-xl" : ""}`
                              : ""
                          }`}
                        >
                          {dayEvents.length > 0 ? (
                            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                          ) : isToday ? (
                            <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          ) : null}
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          /* ─── D-2. 月間カレンダー ─── */
          <div className="bg-[#1E293B]/70 backdrop-blur-[12px] rounded-2xl p-4 border border-white/5">
            {/* ナビゲーション */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-200">
                  {displayYear}年 {displayMonth}月
                </span>
                {monthOffset !== 0 && (
                  <button
                    onClick={() => setMonthOffset(0)}
                    className="text-xs text-primary font-medium px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
                  >
                    今日
                  </button>
                )}
              </div>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-slate-500"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7 gap-1">
              {monthCalendarDates.flat().map((date, i) => {
                if (!date) {
                  return <div key={i} className="h-16" />;
                }

                const isToday = date === todayString;
                const dayNum = new Date(date + "T00:00:00").getDate();
                const dayEvents = events.filter((e) => e.date === date);

                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => openModal(date)}
                    className={`h-16 rounded-xl p-1 flex flex-col items-center touch-manipulation transition-colors ${
                      isToday
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-[#0F172A]/40 border border-white/5 hover:bg-[#1E293B]"
                    }`}
                  >
                    <span
                      className={`text-xs ${
                        isToday
                          ? "text-primary font-bold"
                          : "font-medium text-slate-300"
                      }`}
                    >
                      {dayNum}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      {renderMonthCellDots(dayEvents)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>

    {/* ═══ モーダル（ボトムシート） ═══ */}
    {modalOpen && (
      <>
        {/* 背景オーバーレイ */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9998]"
          onClick={() => setModalOpen(false)}
        />

        {/* シート本体 */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-[#1E293B] rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.4)] animate-slide-up z-[9999] max-h-[90vh] overflow-y-auto"
        >
          {/* ドラッグハンドル */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-slate-600" />
          </div>

          {/* ヘッダー */}
          <div className="flex items-center justify-between px-5 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">記録の追加</h2>
              <p className="text-sm text-slate-400">{formatModalDate(modalDate)}</p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-10 h-10 rounded-full bg-[#334155] flex items-center justify-center hover:bg-[#475569] transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* フルページ入力リンク */}
          {selectedId && (
            <div className="px-5 pb-3">
              <Link
                href={`/record?individual_id=${selectedId}&date=${modalDate}`}
                onClick={() => setModalOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-white/10 bg-[#0F172A]/30 text-xs font-medium text-slate-400 hover:text-primary hover:border-primary/30 transition-colors"
              >
                フルページで入力
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* ローディング */}
          {modalLoading ? (
            <div className="px-5 py-12 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            /* スクロールエリア */
            <div className="px-5 py-4 space-y-6">

              {/* 1. 体調 */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">体調</h3>
                <div className="flex gap-3 justify-center">
                  {CONDITION_LEVELS.map((c) => {
                    const isSelected = conditionInput === c.value;
                    return (
                      <button
                        type="button"
                        key={c.value}
                        onClick={() => setConditionInput(isSelected ? null : c.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-5 rounded-2xl border-2 transition-all
                          ${isSelected
                            ? `${c.border} ${c.bg} ring-2 ${c.ring} scale-105`
                            : "border-white/10 bg-[#0F172A]/30"
                          }`}
                      >
                        <span className="text-3xl">{c.emoji}</span>
                        <span className={`text-xs font-medium ${isSelected ? c.color : "text-slate-500"}`}>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. 給餌 */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">給餌</h3>
                <Link
                  href={`/feeding?individual_id=${selectedId}&date=${modalDate}`}
                  onClick={() => setModalOpen(false)}
                  className="flex items-center justify-between w-full p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">給餌を記録する</span>
                      <p className="text-xs text-slate-500 mt-0.5">種類・量・サプリを入力</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </Link>
                {feedingInputs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {feedingInputs.map((fi) => (
                      <div key={fi.foodType} className="flex items-center gap-2 py-1.5 px-3 bg-[#0F172A]/50 rounded-lg border border-white/10 text-xs">
                        <span className="font-medium text-slate-300">{fi.foodType}</span>
                        <span className="text-slate-500">×</span>
                        <span className="font-bold text-white">{fi.quantity}</span>
                        {fi.dusting && <span className="text-emerald-400 font-medium">Ca</span>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 3. 排泄（うんち） */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">排泄</h3>
                <div className="flex gap-2">
                  {[
                    { label: "普通", emoji: "💩" },
                    { label: "下痢", emoji: "💧" },
                    { label: "なし", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPoopInput(poopInput === opt.label ? null : opt.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-colors
                        ${poopInput === opt.label ? "border-primary bg-primary/10" : "border-white/10 bg-[#0F172A]/30"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="text-[10px] text-slate-500">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 4. 尿酸 */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">尿酸</h3>
                <div className="flex gap-2">
                  {[
                    { label: "白い", emoji: "⚪" },
                    { label: "黄色", emoji: "🟡" },
                    { label: "なし", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setUrineInput(urineInput === opt.label ? null : opt.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-colors
                        ${urineInput === opt.label ? "border-primary bg-primary/10" : "border-white/10 bg-[#0F172A]/30"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="text-[10px] text-slate-500">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 5. 脱皮 */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">脱皮</h3>
                <div className="flex gap-2">
                  {[
                    { label: "白濁",   emoji: "👁️" },
                    { label: "脱皮完了", emoji: "✨" },
                    { label: "不完全", emoji: "⚠️" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setShedInput(shedInput === opt.label ? null : opt.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-colors
                        ${shedInput === opt.label ? "border-primary bg-primary/10" : "border-white/10 bg-[#0F172A]/30"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="text-[10px] text-slate-500">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 6. 体重・体長 */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">体重・体長</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 mb-1 block">体重 (g)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder="--"
                      className="w-full px-3 py-2.5 border border-white/10 bg-[#0F172A]/50 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 mb-1 block">体長 (cm)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={lengthInput}
                      onChange={(e) => setLengthInput(e.target.value)}
                      placeholder="--"
                      className="w-full px-3 py-2.5 border border-white/10 bg-[#0F172A]/50 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </section>

              {/* 7. ケアトグル（8項目） */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">ケア記録</h3>
                <div className="grid grid-cols-4 gap-x-2 gap-y-6">
                  {CARE_TOGGLE_ITEMS.map((item) => {
                    const IconComp = item.icon;
                    const isOn = toggleCares[item.key] ?? false;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() =>
                          setToggleCares((prev) => ({ ...prev, [item.key]: !isOn }))
                        }
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all
                            ${isOn
                              ? `${item.bg} border-current ${item.color} ring-2 ring-current/20 scale-105`
                              : "bg-[#0F172A]/30 border-white/10"
                            }`}
                        >
                          <IconComp className={`w-7 h-7 ${isOn ? item.color : "text-slate-600"}`} />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            isOn ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {item.label}
                        </span>
                        {isOn && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 8. メモ */}
              <section>
                <h3 className="text-sm font-bold text-slate-300 mb-3">メモ</h3>
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder="自由メモ（任意）"
                  rows={3}
                  className="w-full px-4 py-3 border border-white/10 bg-[#0F172A]/50 rounded-2xl text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </section>

              {/* 保存ボタン */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 bg-primary text-white text-sm font-bold rounded-2xl disabled:opacity-50 transition-colors active:bg-primary/90"
              >
                {saving ? "保存中…" : "保存する"}
              </button>

              {/* 下部余白（セーフエリア） */}
              <div className="h-6" />
            </div>
          )}
        </div>
      </>
    )}
    </>
  );
}
