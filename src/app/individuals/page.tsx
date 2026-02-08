'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronRight, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface IndividualRow {
  id: string;
  name: string;
  species: string;
  sex: string;
  morph: string;
  status: string;
  image_url: string | null;
  latest_weight_g: number | null;
  latest_condition: string | null;
  latest_fed_at: string | null;
}

const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ': 'レオパ',
};

export default function IndividualsPage() {
  const [individuals, setIndividuals] = useState<IndividualRow[]>([]);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('individuals_with_latest')
      .select('*')
      .eq('status', '飼育中')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setIndividuals(data as IndividualRow[]);
      });
  }, []);

  // ユニーク種名を抽出
  const uniqueSpecies = useMemo(() => {
    const set = new Set(individuals.map((i) => i.species));
    return Array.from(set);
  }, [individuals]);

  // フィルタリング
  const filtered = useMemo(() => {
    let list = individuals;
    if (speciesFilter) {
      list = list.filter((i) => i.species === speciesFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.morph.toLowerCase().includes(q) ||
          i.species.toLowerCase().includes(q)
      );
    }
    return list;
  }, [individuals, speciesFilter, search]);

  return (
    <div className="bg-[#0F172A] min-h-screen pb-32 text-white">
      {/* ═══ ヘッダー ═══ */}
      <header className="sticky top-0 z-50 bg-[#1E293B]/70 backdrop-blur-[12px] border-b border-white/5 rounded-b-lg px-5 pt-10 pb-4">
        <div className="max-w-lg mx-auto">
          {/* 上部行 */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                個体一覧
              </h1>
              <p className="text-sm text-slate-400">
                {individuals.length}匹を飼育中
              </p>
            </div>
            <Link
              href="/individuals/new"
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-emerald-400 text-slate-900 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(43,238,157,0.3)] text-sm font-bold"
            >
              <Plus size={16} />
              <span>個体を追加</span>
            </Link>
          </div>

          {/* 検索バー */}
          <div className="relative mt-3">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-primary"
            />
            <input
              type="text"
              placeholder="名前、モルフ、IDで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="peer w-full pl-11 pr-4 py-3 rounded-2xl bg-[#1E293B] border-none text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* フィルタータブ */}
          {uniqueSpecies.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 pb-1">
              <button
                onClick={() => setSpeciesFilter(null)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  speciesFilter === null
                    ? 'bg-primary text-slate-900 font-bold shadow-lg shadow-primary/20'
                    : 'bg-[#1E293B] text-slate-300 border border-slate-700 font-medium hover:border-primary/50'
                }`}
              >
                すべて
              </button>
              {uniqueSpecies.map((sp) => (
                <button
                  key={sp}
                  onClick={() =>
                    setSpeciesFilter(speciesFilter === sp ? null : sp)
                  }
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                    speciesFilter === sp
                      ? 'bg-primary text-slate-900 font-bold shadow-lg shadow-primary/20'
                      : 'bg-[#1E293B] text-slate-300 border border-slate-700 font-medium hover:border-primary/50'
                  }`}
                >
                  {SPECIES_SHORT[sp] ?? sp}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ═══ カードリスト ═══ */}
      <div className="max-w-lg mx-auto px-5 flex flex-col gap-3 mt-2">
        {filtered.map((ind) => (
          <Link
            key={ind.id}
            href={`/individuals/${ind.id}`}
            className="group relative block bg-[#1E293B] rounded-xl p-4 border-l-[3px] border-primary shadow-lg shadow-black/20 hover:bg-slate-800 transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              {/* アバター */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-primary/50 transition-colors">
                  {ind.image_url ? (
                    <img
                      src={ind.image_url}
                      alt={ind.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/8 backdrop-blur-[4px] border border-white/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {ind.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                {/* 性別バッジ */}
                {ind.sex && ind.sex !== '不明' && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#1E293B] rounded-full p-0.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        ind.sex === 'オス'
                          ? 'text-blue-400 bg-blue-400/10'
                          : 'text-pink-400 bg-pink-400/10'
                      }`}
                    >
                      {ind.sex === 'オス' ? '♂' : '♀'}
                    </div>
                  </div>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                {/* 名前・種名 */}
                <h3 className="text-lg font-bold leading-tight truncate text-white">
                  {ind.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {SPECIES_SHORT[ind.species] ?? ind.species}
                </p>

                {/* モルフバッジ */}
                {ind.morph && (
                  <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs text-slate-300 bg-slate-700/50 border border-slate-600/50 mt-2">
                    {ind.morph}
                  </span>
                )}

                {/* ステータス行 */}
                <div className="flex items-center mt-3 gap-3 text-sm">
                  {/* 体重 */}
                  {ind.latest_weight_g != null && (
                    <>
                      <div className="flex items-center gap-1">
                        <Scale size={13} className="text-primary" />
                        <span className="font-mono font-medium text-white">
                          {ind.latest_weight_g}
                        </span>
                        <span className="text-xs text-slate-400">g</span>
                      </div>
                      <div className="h-3 w-[1px] bg-slate-600" />
                    </>
                  )}

                  {/* 最終給餌 */}
                  {ind.latest_fed_at && (
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                      {formatDistanceToNow(new Date(ind.latest_fed_at), {
                        addSuffix: true,
                        locale: ja,
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* 矢印 */}
              <ChevronRight
                size={20}
                className="text-slate-500 shrink-0"
              />
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            {search || speciesFilter
              ? '該当する個体が見つかりません'
              : '個体が登録されていません'}
          </div>
        )}
      </div>

      {/* ═══ FAB（個体追加ボタン） ═══ */}
      <Link
        href="/individuals/new"
        className="fixed bottom-24 right-5 z-40 bg-gradient-to-r from-violet-500 to-emerald-400 text-slate-900 rounded-full pl-5 pr-6 py-4 flex items-center gap-2 shadow-[0_0_15px_rgba(43,238,157,0.3)] active:scale-95 hover:opacity-90 hover:-translate-y-1 transition-all"
      >
        <Plus size={20} />
        <span className="text-sm font-bold">個体を追加</span>
      </Link>
    </div>
  );
}
