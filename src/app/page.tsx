"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── 型定義 ──────────────────────────────────────────────

type CareType = "feeding" | "cleaning" | "excretion" | "shedding" | "water" | "weight";

interface CareItem {
  type: CareType;
  label: string;
  icon: string;
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
  emoji: string;
  careRecords: CareRecord[];
}

// ── 定数 ──────────────────────────────────────────────

const CARE_ITEMS: CareItem[] = [
  { type: "feeding",   label: "給餌",     icon: "🦗", color: "text-amber-600" },
  { type: "cleaning",  label: "掃除",     icon: "🧹", color: "text-blue-600" },
  { type: "excretion", label: "排泄",     icon: "💩", color: "text-yellow-700" },
  { type: "shedding",  label: "脱皮",     icon: "✨", color: "text-purple-600" },
  { type: "water",     label: "水換え",   icon: "💧", color: "text-cyan-600" },
  { type: "weight",    label: "体重計測", icon: "⚖️",  color: "text-emerald-600" },
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

// ── ダミーデータ生成 ───────────────────────────────────

function buildInitialData(): Individual[] {
  const dates = getWeekDates(0);
  // dates[0]=月, [1]=火, [2]=水, [3]=木, [4]=金, [5]=土, [6]=日

  return [
    {
      id: "bp-001",
      name: "ナギ",
      species: "ボールパイソン",
      emoji: "🐍",
      careRecords: [
        { date: dates[0], careType: "feeding" },
        { date: dates[2], careType: "excretion" },
        { date: dates[3], careType: "water" },
        { date: dates[5], careType: "feeding" },
      ],
    },
    {
      id: "lp-001",
      name: "ヒナタ",
      species: "レオパードゲッコー",
      emoji: "🦎",
      careRecords: [
        { date: dates[1], careType: "feeding" },
        { date: dates[2], careType: "cleaning" },
        { date: dates[4], careType: "weight" },
        { date: dates[6], careType: "feeding" },
      ],
    },
    {
      id: "bd-001",
      name: "ソラ",
      species: "フトアゴヒゲトカゲ",
      emoji: "🐉",
      careRecords: [
        { date: dates[0], careType: "feeding" },
        { date: dates[0], careType: "water" },
        { date: dates[3], careType: "shedding" },
        { date: dates[5], careType: "feeding" },
      ],
    },
  ];
}

// ── ページコンポーネント ───────────────────────────────

export default function WeeklyCareMatrixPage() {
  const [individuals] = useState<Individual[]>(buildInitialData);
  const [selectedId, setSelectedId] = useState<string>("bp-001");
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const weekDates = getWeekDates(weekOffset);
  const todayString = getTodayString();
  const selectedIndividual = individuals.find((ind) => ind.id === selectedId)!;

  // ヘッダー用の今日の日付表示
  const today = new Date();
  const todayDisplay = `${today.getMonth() + 1}月${today.getDate()}日(${WEEKDAYS[today.getDay()]})`;

  // 週範囲の表示
  const firstDate = formatDate(weekDates[0]);
  const lastDate = formatDate(weekDates[6]);
  const weekRangeLabel = `${new Date(weekDates[0]).getMonth() + 1}/${firstDate.day}(${firstDate.weekday}) 〜 ${new Date(weekDates[6]).getMonth() + 1}/${lastDate.day}(${lastDate.weekday})`;

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
                flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                whitespace-nowrap transition-colors
                ${
                  ind.id === selectedId
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
                }
              `}
            >
              <span>{ind.emoji}</span>
              <span>{ind.name}</span>
            </button>
          ))}
        </div>

        {/* C. マトリクスカード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* C-1. 週ナビゲーション */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {weekRangeLabel}
            </span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* C-2. グリッド本体 */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "540px" }}>
              <thead>
                <tr>
                  <th className="w-16 p-2 sticky left-0 z-10 bg-white"></th>
                  {weekDates.map((date) => {
                    const { day, weekday } = formatDate(date);
                    const isToday = date === todayString;
                    return (
                      <th key={date} className="p-1.5 text-center">
                        <div
                          className={`
                            py-1.5 px-1 rounded-lg text-xs font-medium
                            ${isToday ? "bg-blue-600 text-white" : "text-gray-500"}
                          `}
                        >
                          <div>{weekday}</div>
                          <div
                            className={`text-lg font-bold ${isToday ? "text-white" : "text-gray-800"}`}
                          >
                            {day}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {CARE_ITEMS.map((care) => (
                  <tr key={care.type}>
                    <td className="p-2 text-center sticky left-0 z-10 bg-white">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg">{care.icon}</span>
                        <span className="text-[10px] text-gray-400 font-medium">
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
                        <td key={date} className="p-1.5">
                          <div
                            className={`
                              w-full aspect-square flex items-center justify-center rounded-lg text-lg transition-colors
                              ${isToday ? "ring-2 ring-blue-200" : ""}
                              ${
                                hasRecord
                                  ? "bg-emerald-50 border border-emerald-200"
                                  : "bg-gray-50/80 border border-dashed border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer"
                              }
                            `}
                          >
                            {hasRecord ? care.icon : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
