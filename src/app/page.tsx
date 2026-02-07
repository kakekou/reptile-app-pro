"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bug,
  Brush,
  Droplets,
  Sparkles,
  GlassWater,
  Weight,
} from "lucide-react";

// ── 型定義 ──────────────────────────────────────────────

type CareType = "feeding" | "cleaning" | "excretion" | "shedding" | "water" | "weight";

interface CareItem {
  type: CareType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface CareRecord {
  date: string; // "YYYY-MM-DD"
  careType: CareType;
}

interface Individual {
  id: string;
  name: string;
  species: string;
  careRecords: CareRecord[];
}

// ── 定数 ──────────────────────────────────────────────

const CARE_ITEMS: CareItem[] = [
  { type: "feeding",   label: "給餌",     icon: Bug,        color: "text-amber-600" },
  { type: "cleaning",  label: "掃除",     icon: Brush,      color: "text-blue-500" },
  { type: "excretion", label: "排泄",     icon: Droplets,   color: "text-yellow-600" },
  { type: "shedding",  label: "脱皮",     icon: Sparkles,   color: "text-purple-500" },
  { type: "water",     label: "水換え",   icon: GlassWater, color: "text-cyan-500" },
  { type: "weight",    label: "体重計測", icon: Weight,      color: "text-emerald-500" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const DUMMY_INDIVIDUALS: Individual[] = [
  { id: "bp-001", name: "ナギ",   species: "ボールパイソン",     careRecords: [] },
  { id: "lp-001", name: "ヒナタ", species: "レオパードゲッコー", careRecords: [] },
  { id: "bd-001", name: "ソラ",   species: "フトアゴヒゲトカゲ", careRecords: [] },
];

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

function getISOWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const tmp = new Date(date.getTime());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const firstThursday = new Date(tmp.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const diff = tmp.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

// ── ページコンポーネント ───────────────────────────────

export default function WeeklyCareMatrixPage() {
  const [individuals] = useState<Individual[]>(DUMMY_INDIVIDUALS);
  const [selectedId, setSelectedId] = useState<string>("bp-001");
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const weekDates = getWeekDates(weekOffset);
  const todayString = getTodayString();
  const selectedIndividual = individuals.find((ind) => ind.id === selectedId)!;

  const today = new Date();
  const todayDisplay = `${today.getMonth() + 1}月${today.getDate()}日(${WEEKDAYS[today.getDay()]})`;

  const weekNumber = getISOWeekNumber(weekDates[3]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* A. ヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">ReptiLog</h1>
          <p className="text-sm text-gray-500">{todayDisplay}</p>
        </div>

        {/* B. 個体切り替えタブ */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {individuals.map((ind) => (
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
          ))}
        </div>

        {/* C. マトリクスカード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* C-1. 週ナビゲーション */}
          <div className="flex items-center justify-between px-4 py-3">
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
                  className="text-xs text-blue-600 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
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
            <table className="w-full border-collapse" style={{ minWidth: "540px" }}>
              <thead>
                <tr>
                  <th className="w-20 sticky left-0 z-10 bg-white border-b border-gray-200"></th>
                  {weekDates.map((date) => {
                    const { day, weekday } = formatDate(date);
                    const isToday = date === todayString;
                    return (
                      <th
                        key={date}
                        className={`text-center py-2 text-xs font-medium text-gray-400 border-b border-gray-200 ${isToday ? "bg-blue-50/40" : ""}`}
                      >
                        <div>{weekday}</div>
                        {isToday ? (
                          <span className="w-8 h-8 rounded-full bg-blue-600 text-white inline-flex items-center justify-center text-base font-bold mt-0.5">
                            {day}
                          </span>
                        ) : (
                          <div className="text-base font-bold text-gray-800 mt-0.5">{day}</div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {CARE_ITEMS.map((care) => {
                  const Icon = care.icon;
                  return (
                    <tr key={care.type}>
                      <td className="border-r border-gray-200 border-b border-gray-100 py-4 px-3 w-20 sticky left-0 z-10 bg-white">
                        <div className="flex flex-col items-center gap-0.5">
                          <Icon className={`w-5 h-5 ${care.color}`} />
                          <span className="text-[11px] text-gray-400 mt-1 font-medium">
                            {care.label}
                          </span>
                        </div>
                      </td>
                      {weekDates.map((date) => {
                        const isToday = date === todayString;
                        const hasRecord = selectedIndividual.careRecords.some(
                          (r) => r.date === date && r.careType === care.type
                        );
                        return (
                          <td
                            key={date}
                            className={`border-b border-gray-100 text-center py-3 px-1 ${isToday ? "bg-blue-50/40" : ""}`}
                          >
                            <div className="w-full h-8 flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded transition-colors">
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
      </div>
    </div>
  );
}
