'use client';

import Link from 'next/link';
import {
  Bug,
  Bell,
  Plus,
  Heart,
  Egg,
  Thermometer,
  Droplets,
  FileEdit,
  Pencil,
} from 'lucide-react';

// ── 型定義 ──────────────────────────────────────────────

interface MockPairing {
  id: number;
  species: string;
  speciesColor: 'amber' | 'emerald';
  maleName: string;
  femaleName: string;
  startDate: string;
  dayCount: number;
  daysUntilLaying: number;
  progressPercent: number;
  urgent: boolean;
}

interface MockClutch {
  id: string;
  clutchId: string;
  species: string;
  dueDate: string;
  daysRemaining: number;
  temperature: number;
  humidity: number;
  progressPercent: number;
}

// ── モックデータ ────────────────────────────────────────

const mockPairings: MockPairing[] = [
  {
    id: 1,
    species: 'レオパ',
    speciesColor: 'amber',
    maleName: 'マックスノー',
    femaleName: 'トレンパー',
    startDate: '2023/10/01',
    dayCount: 14,
    daysUntilLaying: 25,
    progressPercent: 35,
    urgent: false,
  },
  {
    id: 2,
    species: 'ボールパイソン',
    speciesColor: 'emerald',
    maleName: 'バナナ',
    femaleName: 'パステル',
    startDate: '2023/09/01',
    dayCount: 45,
    daysUntilLaying: 5,
    progressPercent: 90,
    urgent: true,
  },
];

const mockClutches: MockClutch[] = [
  {
    id: 'A',
    clutchId: '2023-A',
    species: 'ニシアフリカトカゲモドキ',
    dueDate: '11/15',
    daysRemaining: 12,
    temperature: 31.5,
    humidity: 80,
    progressPercent: 75,
  },
  {
    id: 'B',
    clutchId: '2023-B',
    species: 'フトアゴヒゲトカゲ',
    dueDate: '12/20',
    daysRemaining: 45,
    temperature: 29.0,
    humidity: 40,
    progressPercent: 20,
  },
];

// ── 種名バッジスタイル ──────────────────────────────────

const SPECIES_BADGE: Record<string, string> = {
  amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

// ── 円形プログレスコンポーネント ─────────────────────────

function CircularProgress({ percent }: { percent: number }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#334155"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#895af6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {percent}%
      </span>
    </div>
  );
}

// ── メインページ ────────────────────────────────────────

export default function BreedingPage() {
  const activePairCount = mockPairings.length;
  const activeClutchCount = mockClutches.length;

  return (
    <div className="bg-[#0F172A] min-h-dvh pb-32 text-white">
      {/* ═══ ヘッダー ═══ */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#334155]">
        <div className="h-4" />
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <Bug size={22} className="text-[#895af6]" />
            <span className="text-xl font-bold text-white">ReptiLog</span>
          </div>
          <button className="w-9 h-9 rounded-full bg-[#895af6]/20 flex items-center justify-center hover:bg-[#895af6]/30 transition-colors">
            <Bell size={18} className="text-[#895af6]" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* ═══ ページタイトル + 新規ペアボタン ═══ */}
        <div className="flex items-end justify-between px-4 mt-6 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">繁殖プロジェクト</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">
              Breeding Projects
            </p>
          </div>
          <button className="flex items-center gap-1.5 bg-[#895af6] hover:bg-[#7048c6] text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-colors">
            <Plus size={16} />
            <span>新規ペア</span>
          </button>
        </div>

        {/* ═══ サマリー統計カード（2列） ═══ */}
        <div className="grid grid-cols-2 gap-3 px-4 mb-6">
          {/* ペアリング中 */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
            <Heart
              size={64}
              className="absolute top-2 right-2 text-[#895af6] opacity-10"
            />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              ペアリング中
            </span>
            <span className="text-3xl font-bold text-white mt-1">
              {activePairCount}
            </span>
            <span className="text-xs text-slate-500">Pairs</span>
          </div>

          {/* 孵卵中 */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
            <Egg
              size={64}
              className="absolute top-2 right-2 text-[#895af6] opacity-10"
            />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              孵卵中
            </span>
            <span className="text-3xl font-bold text-white mt-1">
              {activeClutchCount}
            </span>
            <span className="text-xs text-slate-500">Clutches</span>
          </div>
        </div>

        {/* ═══ ペアリング管理セクション ═══ */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">ペアリング管理</h2>
            <button className="text-[#895af6] text-sm font-semibold">
              すべて見る
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {mockPairings.map((pair) => (
              <div
                key={pair.id}
                className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden shadow-lg"
              >
                {/* 上部: 画像 + 情報 */}
                <div className="p-4 flex gap-3">
                  {/* 画像プレースホルダー */}
                  <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-800 border border-[#334155]" />

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${SPECIES_BADGE[pair.speciesColor]}`}
                      >
                        {pair.species}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        Day {pair.dayCount}
                      </span>
                    </div>

                    <p className="text-white font-bold text-sm mt-2 truncate">
                      <span className="text-blue-400">♂ {pair.maleName}</span>
                      <span className="text-slate-500 mx-1.5">×</span>
                      <span className="text-pink-400">♀ {pair.femaleName}</span>
                    </p>

                    <p className="text-slate-400 text-xs mt-1">
                      開始日: {pair.startDate}
                    </p>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-medium ${
                        pair.urgent
                          ? 'text-red-400 animate-pulse'
                          : 'text-slate-300'
                      }`}
                    >
                      産卵予測まであと {pair.daysUntilLaying}日
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {pair.progressPercent}%完了
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pair.urgent
                          ? 'bg-gradient-to-r from-[#895af6] to-pink-500'
                          : 'bg-[#895af6] shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                      }`}
                      style={{ width: `${pair.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* アクションフッター */}
                <div className="bg-slate-800/50 border-t border-[#334155] p-2 flex justify-end">
                  <Link
                    href={`/breeding/${pair.id}`}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#334155]/50 text-slate-200 text-xs font-medium hover:bg-[#334155] hover:text-white transition-colors"
                  >
                    <FileEdit size={14} />
                    <span>記録する</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 孵卵管理セクション ═══ */}
        <div className="px-4 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">
            孵卵管理{' '}
            <span className="text-slate-400 font-normal text-sm">
              (Incubation)
            </span>
          </h2>

          <div className="flex flex-col gap-3">
            {mockClutches.map((clutch) => (
              <div
                key={clutch.id}
                className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-center justify-between"
              >
                {/* 左側情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                      Clutch {clutch.clutchId}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <p className="text-white font-bold text-base truncate">
                    {clutch.species}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    予定日: {clutch.dueDate} (あと{clutch.daysRemaining}日)
                  </p>

                  {/* 環境データ */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Thermometer size={14} className="text-slate-500" />
                      <span className="text-[#895af6] font-bold text-sm drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]">
                        {clutch.temperature}°C
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Droplets size={14} className="text-slate-500" />
                      <span className="text-[#895af6] font-bold text-sm drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]">
                        {clutch.humidity}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 右側: 円形プログレス */}
                <CircularProgress percent={clutch.progressPercent} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FAB ═══ */}
      <button className="fixed bottom-24 right-4 z-30 w-12 h-12 bg-[#895af6] text-white rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] flex items-center justify-center hover:bg-[#7048c6] active:scale-95 transition-all">
        <Pencil size={20} />
      </button>
    </div>
  );
}
