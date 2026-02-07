"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Circle,
  Droplets,
  Paintbrush,
  Waves,
  Grab,
  GlassWater,
  Pill,
  Stethoscope,
  HeartHandshake,
  Egg,
  Sparkles,
  Weight,
  StickyNote,
  Camera,
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
  { type: "condition",    label: "体調",       icon: HeartPulse,     color: "text-rose-500" },
  { type: "feeding",      label: "給餌",       icon: () => null,     color: "text-amber-600" },
  { type: "poop",         label: "排泄",       icon: Circle,         color: "text-amber-800" },
  { type: "urine",        label: "尿",         icon: Droplets,       color: "text-yellow-500" },
  { type: "cleaning",     label: "掃除",       icon: Paintbrush,     color: "text-sky-500" },
  { type: "bathing",      label: "温浴",       icon: Waves,          color: "text-cyan-500" },
  { type: "handling",     label: "ﾊﾝﾄﾞﾘﾝｸﾞ",  icon: Grab,           color: "text-orange-500" },
  { type: "water_change", label: "水替え",     icon: GlassWater,     color: "text-blue-500" },
  { type: "medication",   label: "投薬",       icon: Pill,           color: "text-red-500" },
  { type: "hospital",     label: "通院",       icon: Stethoscope,    color: "text-red-600" },
  { type: "mating",       label: "交尾",       icon: HeartHandshake, color: "text-pink-500" },
  { type: "egg_laying",   label: "産卵",       icon: Egg,            color: "text-amber-500" },
  { type: "shedding",     label: "脱皮",       icon: Sparkles,       color: "text-purple-500" },
  { type: "weight",       label: "体重",       icon: Weight,         color: "text-emerald-500" },
  { type: "memo",         label: "メモ",       icon: StickyNote,     color: "text-blue-400" },
  { type: "photo",        label: "写真",       icon: Camera,         color: "text-indigo-400" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const FOOD_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  "コオロギ":     { icon: Bug,          color: "text-amber-700" },
  "デュビア":     { icon: Locate,       color: "text-red-700" },
  "ミルワーム":   { icon: Worm,         color: "text-yellow-600" },
  "ピンクマウス": { icon: Mouse,        color: "text-pink-500" },
  "ヒヨコ":       { icon: Bird,         color: "text-orange-400" },
  "卵":           { icon: Egg,          color: "text-amber-400" },
  "人工フード":   { icon: FlaskConical, color: "text-blue-600" },
  "その他":       { icon: Plus,         color: "text-gray-500" },
};

const CONDITION_COLORS: Record<string, string> = {
  "絶好調": "text-emerald-500",
  "普通":   "text-gray-400",
  "不調":   "text-red-500",
};

const CONDITION_LEVELS = [
  { label: "絶好調", emoji: "😆" },
  { label: "好調",   emoji: "😊" },
  { label: "普通",   emoji: "😐" },
  { label: "不調",   emoji: "😞" },
  { label: "絶不調", emoji: "😵" },
];

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
  { key: "cleaning",     label: "掃除",       icon: Paintbrush,     color: "text-sky-500",    bg: "bg-sky-50" },
  { key: "bathing",      label: "温浴",       icon: Waves,          color: "text-cyan-500",   bg: "bg-cyan-50" },
  { key: "handling",     label: "ﾊﾝﾄﾞﾘﾝｸﾞ",  icon: Grab,           color: "text-orange-500", bg: "bg-orange-50" },
  { key: "water_change", label: "水替え",     icon: GlassWater,     color: "text-blue-500",   bg: "bg-blue-50" },
  { key: "medication",   label: "投薬",       icon: Pill,           color: "text-red-500",    bg: "bg-red-50" },
  { key: "hospital",     label: "通院",       icon: Stethoscope,    color: "text-red-600",    bg: "bg-red-50" },
  { key: "mating",       label: "交尾",       icon: HeartHandshake, color: "text-pink-500",   bg: "bg-pink-50" },
  { key: "egg_laying",   label: "産卵",       icon: Egg,            color: "text-amber-500",  bg: "bg-amber-50" },
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
    dusting: f.dusting,
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
    condition: h.condition,
  }));

  const careLogEvents: CareEvent[] = (careData ?? []).map((c) => ({
    type: c.log_type as CareType,
    date: c.logged_on.slice(0, 10),
  }));

  return [...feedEvents, ...shedEvents, ...measEvents, ...healthEvents, ...careLogEvents];
}

// ── セル描画（週表示用） ──────────────────────────────

function renderCellContent(care: CareItem, dayEvents: CareEvent[]) {
  if (dayEvents.length === 0) return null;

  const Icon = care.icon;

  switch (care.type) {
    case "feeding":
      return (
        <div className="flex items-center justify-center gap-0.5 flex-wrap">
          {dayEvents.map((f, i) => {
            const fi = FOOD_ICONS[f.foodType ?? ""] ?? { icon: Plus, color: "text-gray-400" };
            const IconComp = fi.icon;
            return (
              <div key={i} className="relative">
                <IconComp className={`w-4 h-4 ${fi.color}`} />
                {f.dusting && (
                  <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      );

    case "condition": {
      const cond = dayEvents[0].condition ?? "普通";
      const condColor = CONDITION_COLORS[cond] ?? "text-gray-400";
      return <HeartPulse className={`w-5 h-5 ${condColor}`} />;
    }

    case "weight": {
      const w = dayEvents[0].weight_g;
      if (w != null && w > 0) {
        return <span className="text-[11px] font-bold text-emerald-600">{w}</span>;
      }
      return <Icon className={`w-5 h-5 ${care.color}`} />;
    }

    default:
      return <Icon className={`w-5 h-5 ${care.color}`} />;
  }
}

// ── セル描画（月表示用） ──────────────────────────────

function renderMonthCellIcons(dayEvents: CareEvent[]) {
  if (dayEvents.length === 0) return null;

  const uniqueTypes = CARE_ITEMS
    .filter((care) => dayEvents.some((e) => e.type === care.type))
    .slice(0, 5);

  return uniqueTypes.map((care) => {
    if (care.type === "feeding") {
      const feedEvent = dayEvents.find((e) => e.type === "feeding");
      const fi = FOOD_ICONS[feedEvent?.foodType ?? ""];
      if (fi) {
        const IconComp = fi.icon;
        return <IconComp key={care.type} className={`w-4 h-4 ${fi.color}`} />;
      }
      return <Bug key={care.type} className="w-4 h-4 text-amber-600" />;
    }

    if (care.type === "condition") {
      const condEvent = dayEvents.find((e) => e.type === "condition");
      const condColor = CONDITION_COLORS[condEvent?.condition ?? "普通"] ?? "text-gray-400";
      return <care.icon key={care.type} className={`w-4 h-4 ${condColor}`} />;
    }

    return <care.icon key={care.type} className={`w-4 h-4 ${care.color}`} />;
  });
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
  }

  function openModal(date: string) {
    console.log("openModal called:", date);
    resetAllInputs();
    setModalDate(date);

    // 既存データで初期化
    const dayEvents = events.filter((e) => e.date === date);

    const condEvent = dayEvents.find((e) => e.type === "condition");
    if (condEvent?.condition) setConditionInput(condEvent.condition);

    const feeds = dayEvents.filter((e) => e.type === "feeding");
    if (feeds.length > 0) {
      setFeedingInputs(
        feeds.map((f) => ({
          foodType: f.foodType ?? "コオロギ",
          quantity: 1,
          dusting: f.dusting ?? false,
          refused: false,
        }))
      );
    }

    const poopEvent = dayEvents.find((e) => e.type === "poop");
    if (poopEvent) setPoopInput("普通");

    const urineEvent = dayEvents.find((e) => e.type === "urine");
    if (urineEvent) setUrineInput("普通");

    const shedEvent = dayEvents.find((e) => e.type === "shedding");
    if (shedEvent) setShedInput("完全");

    const weightEvent = dayEvents.find((e) => e.type === "weight");
    if (weightEvent?.weight_g) setWeightInput(String(weightEvent.weight_g));

    const toggleMap: Record<string, boolean> = {};
    CARE_TOGGLE_ITEMS.forEach((item) => {
      if (dayEvents.some((e) => e.type === item.key)) {
        toggleMap[item.key] = true;
      }
    });
    setToggleCares(toggleMap);

    setModalOpen(true);
  }

  async function handleSave() {
    // Part C で実装
    console.log("handleSave", {
      date: modalDate,
      condition: conditionInput,
      feedings: feedingInputs,
      poop: poopInput,
      urine: urineInput,
      shed: shedInput,
      weight: weightInput,
      length: lengthInput,
      toggleCares,
      memo: memoInput,
    });
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setModalOpen(false);
    }, 300);
  }

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
      supabase.from("feedings").select("id, fed_at, food_type, dusting")
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
      supabase.from("care_logs").select("id, log_type, logged_on")
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
  }, [viewMode, selectedId, weekOffset]);

  // Effect 3: 月間ケア記録の取得
  useEffect(() => {
    if (viewMode !== "month" || !selectedId) return;

    const { startDate, endDate } = getMonthRange(monthOffset);
    const supabase = createClient();

    Promise.all([
      supabase.from("feedings").select("id, fed_at, food_type, dusting")
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
      supabase.from("care_logs").select("id, log_type, logged_on")
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
  }, [viewMode, selectedId, monthOffset]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* A. ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">ReptiLog</h1>
          <p className="text-sm text-gray-500">{todayDisplay}</p>
        </div>

        {/* B. 個体切り替えタブ */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {loading ? (
            <>
              <div className="h-9 animate-pulse bg-gray-100 rounded-full w-24" />
              <div className="h-9 animate-pulse bg-gray-100 rounded-full w-24" />
              <div className="h-9 animate-pulse bg-gray-100 rounded-full w-24" />
            </>
          ) : individuals.length === 0 ? (
            <p className="text-sm text-gray-400">
              個体を登録してください →{" "}
              <a href="/individuals/new" className="text-blue-600 font-medium hover:underline">
                個体一覧
              </a>
            </p>
          ) : (
            individuals.map((ind) => (
              <button
                key={ind.id}
                onClick={() => setSelectedId(ind.id)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium
                  whitespace-nowrap transition-colors
                  ${
                    ind.id === selectedId
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
                  }
                `}
              >
                {ind.name}
              </button>
            ))
          )}
        </div>

        {/* C. マトリクスカード */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : individuals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">個体が登録されていません</p>
            <a
              href="/individuals/new"
              className="text-blue-600 text-sm font-medium mt-2 inline-block hover:underline"
            >
              ＋ 個体を登録する
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* C-1. ナビゲーション */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              {viewMode === "week" ? (
                <>
                  <button
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>前週</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      第{weekNumber}週
                    </span>
                    {weekOffset !== 0 && (
                      <button
                        onClick={() => setWeekOffset(0)}
                        className="text-xs text-blue-600 font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        今日
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setWeekOffset((w) => w + 1)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>次週</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMonthOffset((m) => m - 1)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      {displayYear}年 {displayMonth}月
                    </span>
                    {monthOffset !== 0 && (
                      <button
                        onClick={() => setMonthOffset(0)}
                        className="text-xs text-blue-600 font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        今日
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setMonthOffset((m) => m + 1)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* 週/月 切り替えボタン */}
            <div className="flex justify-end px-4 py-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${viewMode === "week" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                >
                  週
                </button>
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${viewMode === "month" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                >
                  月
                </button>
              </div>
            </div>

            {viewMode === "week" ? (
              /* C-2. 週間グリッド本体 */
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: "60px" }} />
                    <col /><col /><col /><col /><col /><col /><col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="py-2 sticky left-0 z-10 bg-white border border-gray-200"></th>
                      {weekDates.map((date) => {
                        const { day, weekday } = formatDate(date);
                        const isToday = date === todayString;
                        return (
                          <th key={date} className="py-2 text-center border border-gray-200">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs text-gray-400 font-medium">{weekday}</span>
                              {isToday ? (
                                <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-base font-bold inline-flex items-center justify-center">
                                  {day}
                                </span>
                              ) : (
                                <span className="text-base font-bold text-gray-800">{day}</span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {CARE_ITEMS.map((care) => (
                      <tr key={care.type}>
                        <td className="py-3 px-2 text-left sticky left-0 z-10 bg-white border border-gray-200">
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{care.label}</span>
                        </td>
                        {weekDates.map((date) => {
                          const isToday = date === todayString;
                          const dayEvents = events.filter(
                            (e) => e.type === care.type && e.date === date
                          );
                          return (
                            <td
                              key={date}
                              className={`py-2 px-1 text-center border border-gray-200 ${isToday ? "bg-blue-50/40" : ""}`}
                            >
                              <div
                                onClick={() => openModal(date)}
                                className="w-full h-10 flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded transition-colors"
                              >
                                {renderCellContent(care, dayEvents)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* C-3. 月間カレンダーグリッド */
              <div className="p-2">
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* 週ごとの行 */}
                {monthCalendarDates.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((date, di) => {
                      if (!date) {
                        return <div key={di} className="border border-gray-100 min-h-[88px]" />;
                      }

                      const isToday = date === todayString;
                      const dayNum = new Date(date + "T00:00:00").getDate();
                      const dayEvents = events.filter((e) => e.date === date);

                      return (
                        <div
                          key={di}
                          onClick={() => openModal(date)}
                          className={`border border-gray-200 min-h-[88px] p-1 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? "bg-blue-50/40" : ""}`}
                        >
                          <div className="flex justify-end mb-0.5">
                            {isToday ? (
                              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center">
                                {dayNum}
                              </span>
                            ) : (
                              <span
                                className={`text-sm font-medium ${
                                  di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : "text-gray-700"
                                }`}
                              >
                                {dayNum}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {renderMonthCellIcons(dayEvents)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── モーダル（ボトムシート） ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* 背景オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setModalOpen(false)}
          />

          {/* シート本体 */}
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl animate-slide-up max-h-[85dvh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-gray-900">
                {formatModalDate(modalDate)}
              </h2>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-full disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>

            {/* スクロールエリア */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">

              {/* 1. 体調 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">体調</h3>
                <div className="flex gap-2">
                  {CONDITION_LEVELS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => setConditionInput(conditionInput === c.label ? null : c.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors
                        ${conditionInput === c.label
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                        }`}
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-[10px] text-gray-500">{c.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 2. 給餌 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">給餌</h3>

                {/* 餌の種類アイコングリッド */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {FOOD_OPTIONS.map((food) => {
                    const IconComp = food.icon;
                    const isSelected = feedingInputs.some((f) => f.foodType === food.key);
                    return (
                      <button
                        key={food.key}
                        onClick={() => {
                          if (isSelected) {
                            setFeedingInputs((prev) => prev.filter((f) => f.foodType !== food.key));
                          } else {
                            setFeedingInputs((prev) => [
                              ...prev,
                              { foodType: food.key, quantity: 1, dusting: false, refused: false },
                            ]);
                          }
                        }}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors
                          ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                      >
                        <IconComp className={`w-6 h-6 ${food.color}`} />
                        <span className="text-[10px] text-gray-500">{food.key}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 選択済みの餌ごとの詳細 */}
                {feedingInputs.map((fi, idx) => (
                  <div key={fi.foodType} className="flex items-center gap-3 py-2 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-600 w-20 truncate">{fi.foodType}</span>

                    {/* 数量 */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setFeedingInputs((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, quantity: Math.max(0, f.quantity - 1) } : f
                            )
                          );
                        }}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{fi.quantity}</span>
                      <button
                        onClick={() => {
                          setFeedingInputs((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, quantity: f.quantity + 1 } : f
                            )
                          );
                        }}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* ダスティング */}
                    <button
                      onClick={() => {
                        setFeedingInputs((prev) =>
                          prev.map((f, i) =>
                            i === idx ? { ...f, dusting: !f.dusting } : f
                          )
                        );
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors
                        ${fi.dusting ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-gray-200 text-gray-400"}`}
                    >
                      Ca
                    </button>

                    {/* 拒食 */}
                    <button
                      onClick={() => {
                        setFeedingInputs((prev) =>
                          prev.map((f, i) =>
                            i === idx ? { ...f, refused: !f.refused } : f
                          )
                        );
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors
                        ${fi.refused ? "bg-red-50 border-red-400 text-red-700" : "border-gray-200 text-gray-400"}`}
                    >
                      拒食
                    </button>
                  </div>
                ))}
              </section>

              {/* 3. 排泄（うんち） */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">排泄</h3>
                <div className="flex gap-2">
                  {[
                    { label: "普通", emoji: "💩" },
                    { label: "下痢", emoji: "💧" },
                    { label: "なし", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setPoopInput(poopInput === opt.label ? null : opt.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors
                        ${poopInput === opt.label ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="text-[10px] text-gray-500">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 4. 尿酸 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">尿酸</h3>
                <div className="flex gap-2">
                  {[
                    { label: "白い", emoji: "⚪" },
                    { label: "黄色", emoji: "🟡" },
                    { label: "なし", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setUrineInput(urineInput === opt.label ? null : opt.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors
                        ${urineInput === opt.label ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="text-[10px] text-gray-500">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 5. 脱皮 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">脱皮</h3>
                <div className="flex gap-2">
                  {[
                    { label: "白濁",   emoji: "👁️" },
                    { label: "脱皮完了", emoji: "✨" },
                    { label: "不完全", emoji: "⚠️" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setShedInput(shedInput === opt.label ? null : opt.label)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors
                        ${shedInput === opt.label ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className="text-[10px] text-gray-500">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 6. 体重・体長 */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">体重・体長</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">体重 (g)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">体長 (cm)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={lengthInput}
                      onChange={(e) => setLengthInput(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </section>

              {/* 7. ケアトグル（8項目） */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">ケア記録</h3>
                <div className="grid grid-cols-4 gap-2">
                  {CARE_TOGGLE_ITEMS.map((item) => {
                    const IconComp = item.icon;
                    const isOn = toggleCares[item.key] ?? false;
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          setToggleCares((prev) => ({ ...prev, [item.key]: !isOn }))
                        }
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-colors
                          ${isOn ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                      >
                        <IconComp className={`w-5 h-5 ${isOn ? item.color : "text-gray-300"}`} />
                        <span className={`text-[10px] ${isOn ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                          {item.label}
                        </span>
                        {isOn && <Check className="w-3 h-3 text-blue-500" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 8. メモ */}
              <section>
                <h3 className="text-sm font-bold text-gray-700 mb-2">メモ</h3>
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder="自由メモ（任意）"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400"
                />
              </section>

              {/* 下部余白（セーフエリア） */}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
