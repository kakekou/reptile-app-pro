"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Weight } from "lucide-react";
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
  foodType?: string;
  dusting?: boolean;
}

interface FeedingInput {
  foodType: string;
  quantity: number;
  dusting: boolean;
}

interface ShedInput {
  completeness: "完全" | "不完全";
}

// ── 定数 ──────────────────────────────────────────────

const CARE_ITEMS: CareItem[] = [
  { type: "feeding",  label: "給餌",     icon: () => null, color: "text-amber-600" },
  { type: "shedding", label: "脱皮",     icon: Sparkles,   color: "text-purple-500" },
  { type: "weight",   label: "体重計測", icon: Weight,      color: "text-emerald-500" },
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

function formatModalDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日(${WEEKDAYS[d.getDay()]})`;
}

// ── ページコンポーネント ───────────────────────────────

export default function WeeklyCareMatrixPage() {
  const [individuals, setIndividuals] = useState<IndividualTab[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchCount, setRefetchCount] = useState(0);

  // モーダル制御
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>("");
  const [feedingInputs, setFeedingInputs] = useState<FeedingInput[]>([]);
  const [shedInput, setShedInput] = useState<ShedInput | null>(null);
  const [weightInput, setWeightInput] = useState<string>("");
  const [saving, setSaving] = useState(false);

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

  // Effect 2: ケア記録の取得（selectedId or weekOffset or refetchCount 変更時）
  useEffect(() => {
    if (!selectedId) return;

    const supabase = createClient();
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    Promise.all([
      supabase
        .from("feedings")
        .select("id, fed_at, food_type, dusting")
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
      }));

      setEvents([...feedEvents, ...shedEvents, ...measEvents]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, weekOffset, refetchCount]);

  // ── セルタップ ──

  const handleCellTap = (date: string) => {
    setModalDate(date);
    const dayFeedings = events.filter((e) => e.type === "feeding" && e.date === date);
    setFeedingInputs(
      dayFeedings.length > 0
        ? dayFeedings.map((f) => ({ foodType: f.foodType ?? "コオロギ", quantity: 1, dusting: f.dusting ?? false }))
        : []
    );
    setShedInput(null);
    setWeightInput("");
    setModalOpen(true);
  };

  // ── 保存処理 ──

  const handleSave = async () => {
    if (!selectedId || !modalDate) return;
    setSaving(true);

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises: PromiseLike<any>[] = [];

      for (const fi of feedingInputs) {
        promises.push(
          supabase.from("feedings").insert({
            individual_id: selectedId,
            fed_at: modalDate + "T12:00:00",
            food_type: fi.foodType,
            quantity: fi.quantity,
            dusting: fi.dusting,
            refused: false,
            notes: "",
          })
        );
      }

      if (shedInput) {
        promises.push(
          supabase.from("sheds").insert({
            individual_id: selectedId,
            shed_on: modalDate,
            completeness: shedInput.completeness,
            notes: "",
          })
        );
      }

      if (weightInput && parseFloat(weightInput) > 0) {
        promises.push(
          supabase.from("measurements").insert({
            individual_id: selectedId,
            measured_on: modalDate,
            weight_g: parseFloat(weightInput),
            notes: "",
          })
        );
      }

      await Promise.all(promises);
      setModalOpen(false);
      setRefetchCount((c) => c + 1);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const hasModalInput = feedingInputs.length > 0 || shedInput !== null || weightInput !== "";

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
                          const hasRecord = events.some(
                            (e) => e.type === care.type && e.date === date
                          );
                          return (
                            <td
                              key={date}
                              className={`p-0.5 text-center ${isToday ? "bg-blue-50/40" : ""}`}
                            >
                              <div
                                onClick={() => handleCellTap(date)}
                                className="w-full h-9 flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded transition-colors"
                              >
                                {care.type === "feeding" ? (
                                  (() => {
                                    const dayFeedings = events.filter(
                                      (e) => e.type === "feeding" && e.date === date
                                    );
                                    if (dayFeedings.length === 0) return null;
                                    return (
                                      <div className="flex items-center justify-center gap-0.5 flex-wrap">
                                        {dayFeedings.map((f, i) => {
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
                                  })()
                                ) : (
                                  hasRecord && <Icon className={`w-4 h-4 ${care.color}`} />
                                )}
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

      {/* ── 記録入力モーダル（ボトムシート） ── */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setModalOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up">
            {/* ハンドルバー */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {formatModalDate(modalDate)}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                キャンセル
              </button>
            </div>

            {/* コンテンツ */}
            <div className="px-4 py-4 space-y-6">
              {/* === 給餌セクション === */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800">給餌</h3>
                  <button
                    onClick={() => setFeedingInputs([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    リセット
                  </button>
                </div>

                {feedingInputs.map((fi, index) => (
                  <div key={index} className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">給餌{index + 1}</span>
                      <button
                        onClick={() => setFeedingInputs((prev) => prev.filter((_, i) => i !== index))}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        削除
                      </button>
                    </div>

                    {/* 餌タイプ選択 */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {Object.entries(FOOD_ICONS).map(([name, f]) => (
                        <button
                          key={name}
                          onClick={() => {
                            const updated = [...feedingInputs];
                            updated[index] = { ...updated[index], foodType: name };
                            setFeedingInputs(updated);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${fi.foodType === name
                              ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                              : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}
                        >
                          <span className={`text-sm font-bold ${f.color}`}>{f.symbol}</span>
                          <div className="text-[9px] text-gray-400 mt-0.5">{name}</div>
                        </button>
                      ))}
                    </div>

                    {/* 数量 + ダスティング */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">数量</span>
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => {
                              const updated = [...feedingInputs];
                              updated[index] = { ...updated[index], quantity: Math.max(1, fi.quantity - 1) };
                              setFeedingInputs(updated);
                            }}
                            className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                          >
                            −
                          </button>
                          <span className="px-3 py-1 text-sm font-medium text-gray-800 min-w-[2rem] text-center">
                            {fi.quantity}
                          </span>
                          <button
                            onClick={() => {
                              const updated = [...feedingInputs];
                              updated[index] = { ...updated[index], quantity: fi.quantity + 1 };
                              setFeedingInputs(updated);
                            }}
                            className="px-2 py-1 text-gray-500 hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const updated = [...feedingInputs];
                          updated[index] = { ...updated[index], dusting: !fi.dusting };
                          setFeedingInputs(updated);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                          ${fi.dusting
                            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                            : "bg-white text-gray-400 border border-gray-200"}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ca+
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setFeedingInputs((prev) => [...prev, { foodType: "コオロギ", quantity: 1, dusting: false }])}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                >
                  ＋ 給餌を追加
                </button>
              </section>

              {/* === 脱皮セクション === */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800">脱皮</h3>
                  <button
                    onClick={() => setShedInput(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    リセット
                  </button>
                </div>
                <div className="flex gap-2">
                  {(["完全", "不完全"] as const).map((comp) => (
                    <button
                      key={comp}
                      onClick={() => setShedInput(shedInput?.completeness === comp ? null : { completeness: comp })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors
                        ${shedInput?.completeness === comp
                          ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                          : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </section>

              {/* === 体重計測セクション === */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800">体重計測</h3>
                  <button
                    onClick={() => setWeightInput("")}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    リセット
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                  <span className="text-sm text-gray-500 font-medium">g</span>
                </div>
              </section>
            </div>

            {/* 保存ボタン */}
            <div className="sticky bottom-0 px-4 py-3 bg-white border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving || !hasModalInput}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-colors
                  ${saving || !hasModalInput
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"}`}
              >
                {saving ? "保存中..." : "登録"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
