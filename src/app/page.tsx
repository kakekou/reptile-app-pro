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
  | "weight";

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
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const FOOD_ICONS: Record<string, { symbol: string; color: string }> = {
  "コオロギ":     { symbol: "コ", color: "text-amber-700" },
  "デュビア":     { symbol: "デ", color: "text-red-700" },
  "ミルワーム":   { symbol: "ミ", color: "text-yellow-600" },
  "ピンクマウス": { symbol: "ピ", color: "text-pink-500" },
  "ヒヨコ":       { symbol: "ヒ", color: "text-orange-400" },
  "卵":           { symbol: "卵", color: "text-amber-400" },
  "人工フード":   { symbol: "人", color: "text-blue-600" },
  "その他":       { symbol: "他", color: "text-gray-500" },
};

const CONDITION_COLORS: Record<string, string> = {
  "絶好調": "text-emerald-500",
  "普通":   "text-gray-400",
  "不調":   "text-red-500",
};

// ── ユーティリティ関数 ─────────────────────────────────

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
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
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
  const t = new Date();
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getISOWeekNumber(date: Date): number {
  const tmp = new Date(date.getTime());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const firstThursday = new Date(tmp.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const diff = tmp.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

// ── セル描画 ──────────────────────────────────────────

function renderCellContent(care: CareItem, dayEvents: CareEvent[]) {
  if (dayEvents.length === 0) return null;

  const Icon = care.icon;

  switch (care.type) {
    case "feeding":
      return (
        <div className="flex items-center justify-center gap-0.5 flex-wrap">
          {dayEvents.map((f, i) => {
            const foodIcon = FOOD_ICONS[f.foodType ?? ""] ?? {
              symbol: "?",
              color: "text-gray-400",
            };
            return (
              <div key={i} className="relative">
                <span className={`text-[11px] font-bold ${foodIcon.color}`}>
                  {foodIcon.symbol}
                </span>
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
      return <HeartPulse className={`w-3.5 h-3.5 ${condColor}`} />;
    }

    case "weight": {
      const w = dayEvents[0].weight_g;
      if (w != null && w > 0) {
        return <span className="text-[10px] font-bold text-emerald-600">{w}</span>;
      }
      return <Icon className={`w-3.5 h-3.5 ${care.color}`} />;
    }

    default:
      return <Icon className={`w-3.5 h-3.5 ${care.color}`} />;
  }
}

// ── ページコンポーネント ───────────────────────────────

export default function WeeklyCareMatrixPage() {
  const [individuals, setIndividuals] = useState<IndividualTab[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = getWeekDates(weekOffset);
  const todayString = getTodayString();

  const today = new Date();
  const todayDisplay = `${today.getMonth() + 1}月${today.getDate()}日(${WEEKDAYS[today.getDay()]})`;

  const thursdayParts = weekDates[3].split("-").map(Number);
  const weekNumber = getISOWeekNumber(new Date(thursdayParts[0], thursdayParts[1] - 1, thursdayParts[2]));

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

  // Effect 2: ケア記録の取得（selectedId or weekOffset 変更時）
  useEffect(() => {
    if (!selectedId) return;

    const supabase = createClient();
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    Promise.all([
      // feedings
      supabase
        .from("feedings")
        .select("id, fed_at, food_type, dusting")
        .eq("individual_id", selectedId)
        .gte("fed_at", startDate + "T00:00:00")
        .lte("fed_at", endDate + "T23:59:59"),
      // sheds
      supabase
        .from("sheds")
        .select("id, shed_on")
        .eq("individual_id", selectedId)
        .gte("shed_on", startDate)
        .lte("shed_on", endDate),
      // measurements
      supabase
        .from("measurements")
        .select("id, measured_on, weight_g")
        .eq("individual_id", selectedId)
        .gte("measured_on", startDate)
        .lte("measured_on", endDate),
      // health_logs
      supabase
        .from("health_logs")
        .select("id, logged_on, condition")
        .eq("individual_id", selectedId)
        .gte("logged_on", startDate)
        .lte("logged_on", endDate),
      // care_logs
      supabase
        .from("care_logs")
        .select("id, log_type, logged_on")
        .eq("individual_id", selectedId)
        .gte("logged_on", startDate)
        .lte("logged_on", endDate),
    ]).then(([feedRes, shedRes, measRes, healthRes, careRes]) => {
      if (feedRes.error) console.error("Failed to fetch feedings:", feedRes.error);
      if (shedRes.error) console.error("Failed to fetch sheds:", shedRes.error);
      if (measRes.error) console.error("Failed to fetch measurements:", measRes.error);
      if (healthRes.error) console.error("Failed to fetch health_logs:", healthRes.error);
      if (careRes.error) console.error("Failed to fetch care_logs:", careRes.error);

      const feedEvents: CareEvent[] = (feedRes.data ?? []).map((f) => ({
        type: "feeding" as CareType,
        date: f.fed_at.slice(0, 10),
        foodType: f.food_type,
        dusting: f.dusting,
      }));

      const shedEvents: CareEvent[] = (shedRes.data ?? []).map((s) => ({
        type: "shedding" as CareType,
        date: s.shed_on.slice(0, 10),
      }));

      const measEvents: CareEvent[] = (measRes.data ?? []).map((m) => ({
        type: "weight" as CareType,
        date: m.measured_on.slice(0, 10),
        weight_g: m.weight_g,
      }));

      const healthEvents: CareEvent[] = (healthRes.data ?? []).map((h) => ({
        type: "condition" as CareType,
        date: h.logged_on.slice(0, 10),
        condition: h.condition,
      }));

      const careLogEvents: CareEvent[] = (careRes.data ?? []).map((c) => ({
        type: c.log_type as CareType,
        date: c.logged_on.slice(0, 10),
      }));

      setEvents([
        ...feedEvents,
        ...shedEvents,
        ...measEvents,
        ...healthEvents,
        ...careLogEvents,
      ]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, weekOffset]);

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
            {/* C-1. 週ナビゲーション */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
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
            </div>

            {/* C-2. グリッド本体 */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "48px" }} />
                  <col /><col /><col /><col /><col /><col /><col />
                </colgroup>
                <thead>
                  <tr>
                    <th className="p-0.5 sticky left-0 z-10 bg-white"></th>
                    {weekDates.map((date) => {
                      const { day, weekday } = formatDate(date);
                      const isToday = date === todayString;
                      return (
                        <th key={date} className="p-0.5 text-center">
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <span className="text-[10px] text-gray-400 font-medium leading-none">{weekday}</span>
                            {isToday ? (
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center mt-0.5">
                                {day}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-gray-800 mt-0.5">{day}</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {CARE_ITEMS.map((care) => {
                    const Icon = care.icon;
                    return (
                      <tr key={care.type} className="border-t border-gray-100">
                        <td className="p-0.5 text-center sticky left-0 z-10 bg-white border-r border-gray-100">
                          <div className="flex flex-col items-center gap-0.5">
                            {care.type === "feeding" ? (
                              <span className="text-[11px] font-bold text-amber-600 leading-none">餌</span>
                            ) : (
                              <Icon className={`w-3.5 h-3.5 ${care.color}`} />
                            )}
                            <span className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">{care.label}</span>
                          </div>
                        </td>
                        {weekDates.map((date) => {
                          const isToday = date === todayString;
                          const dayEvents = events.filter(
                            (e) => e.type === care.type && e.date === date
                          );
                          return (
                            <td
                              key={date}
                              className={`p-0.5 text-center ${isToday ? "bg-blue-50/40" : ""}`}
                            >
                              <div className="w-full h-8 flex items-center justify-center">
                                {renderCellContent(care, dayEvents)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 凡例 */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2 border-t border-gray-50">
              <span className="text-[10px] text-gray-300">凡例:</span>
              {Object.entries(FOOD_ICONS).map(([name, f]) => (
                <span key={name} className="flex items-center gap-0.5">
                  <span className={`text-[10px] font-bold ${f.color}`}>{f.symbol}</span>
                  <span className="text-[9px] text-gray-400">{name}</span>
                </span>
              ))}
              <span className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[9px] text-gray-400">Ca+</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
