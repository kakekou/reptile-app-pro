"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Bug, Sparkles, Weight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── 型定義 ──────────────────────────────────────────────

type CareType = "feeding" | "shedding" | "weight";

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
}

// ── 定数 ──────────────────────────────────────────────

const CARE_ITEMS: CareItem[] = [
  { type: "feeding",  label: "給餌",     icon: Bug,      color: "text-amber-600" },
  { type: "shedding", label: "脱皮",     icon: Sparkles, color: "text-purple-500" },
  { type: "weight",   label: "体重計測", icon: Weight,    color: "text-emerald-500" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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
      supabase
        .from("feedings")
        .select("id, fed_at")
        .eq("individual_id", selectedId)
        .gte("fed_at", startDate + "T00:00:00")
        .lte("fed_at", endDate + "T23:59:59"),
      supabase
        .from("sheds")
        .select("id, shed_on")
        .eq("individual_id", selectedId)
        .gte("shed_on", startDate)
        .lte("shed_on", endDate),
      supabase
        .from("measurements")
        .select("id, measured_on")
        .eq("individual_id", selectedId)
        .gte("measured_on", startDate)
        .lte("measured_on", endDate),
    ]).then(([feedRes, shedRes, measRes]) => {
      if (feedRes.error) console.error("Failed to fetch feedings:", feedRes.error);
      if (shedRes.error) console.error("Failed to fetch sheds:", shedRes.error);
      if (measRes.error) console.error("Failed to fetch measurements:", measRes.error);

      const feedEvents: CareEvent[] = (feedRes.data ?? []).map((f) => ({
        type: "feeding" as CareType,
        date: f.fed_at.slice(0, 10),
      }));
      const shedEvents: CareEvent[] = (shedRes.data ?? []).map((s) => ({
        type: "shedding" as CareType,
        date: s.shed_on.slice(0, 10),
      }));
      const measEvents: CareEvent[] = (measRes.data ?? []).map((m) => ({
        type: "weight" as CareType,
        date: m.measured_on.slice(0, 10),
      }));

      setEvents([...feedEvents, ...shedEvents, ...measEvents]);
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !loading && individuals.length === 0 ? (
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
              <table className="w-full table-fixed" style={{ minWidth: "480px" }}>
                <thead>
                  <tr>
                    <th className="w-14 p-1 sticky left-0 z-10 bg-white"></th>
                    {weekDates.map((date) => {
                      const { day, weekday } = formatDate(date);
                      const isToday = date === todayString;
                      return (
                        <th key={date} className="p-1 text-center">
                          <div className="flex flex-col items-center gap-0.5 py-1">
                            <span className="text-[10px] text-gray-400 font-medium">{weekday}</span>
                            {isToday ? (
                              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold inline-flex items-center justify-center">
                                {day}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-gray-800">{day}</span>
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
                        <td className="p-1 text-center sticky left-0 z-10 bg-white border-r border-gray-100">
                          <div className="flex flex-col items-center gap-0.5">
                            <Icon className={`w-4 h-4 ${care.color}`} />
                            <span className="text-[10px] text-gray-400 font-medium">{care.label}</span>
                          </div>
                        </td>
                        {weekDates.map((date) => {
                          const isToday = date === todayString;
                          const hasRecord = events.some(
                            (e) => e.type === care.type && e.date === date
                          );
                          return (
                            <td
                              key={date}
                              className={`p-1 text-center ${isToday ? "bg-blue-50/40" : ""}`}
                            >
                              <div className="w-full h-10 flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded transition-colors">
                                {hasRecord && <Icon className={`w-5 h-5 ${care.color}`} />}
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
          </div>
        )}
      </div>
    </div>
  );
}
