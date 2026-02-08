'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronRight } from 'lucide-react';
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
    <div className="bg-slate-100 min-h-screen pb-32">
      {/* ═══ ヘッダー ═══ */}
      <header className="sticky top-0 z-40 bg-slate-100/90 backdrop-blur-md px-5 pt-10 pb-4">
        <div className="max-w-lg mx-auto">
          {/* 上部行 */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                My Collection
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800">
                個体一覧
              </h1>
              <p className="text-sm text-slate-500">
                {individuals.length}匹を飼育中
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 ring-2 ring-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-500">
              🦎
            </div>
          </div>

          {/* 検索バー */}
          <div className="relative mt-3">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="名前・モルフで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border-none text-sm text-slate-800 placeholder:text-gray-400 outline-none shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* フィルタータブ */}
          {uniqueSpecies.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 pb-1">
              <button
                onClick={() => setSpeciesFilter(null)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  speciesFilter === null
                    ? 'bg-primary text-white font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-white text-slate-500 border border-gray-100 font-medium'
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
                      ? 'bg-primary text-white font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-white text-slate-500 border border-gray-100 font-medium'
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
            className="relative block bg-white rounded-2xl p-5 border border-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_10px_30px_-5px_rgba(16,185,129,0.05)] active:scale-[0.99] transition-all duration-300"
          >
            {/* 左端アクセントライン */}
            <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary/80 rounded-full" />

            <div className="flex items-center gap-4">
              {/* アイコン / 画像 */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 border border-white/50 flex items-center justify-center shrink-0 overflow-hidden">
                {ind.image_url ? (
                  <img
                    src={ind.image_url}
                    alt={ind.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="text-2xl font-black text-slate-600">
                    {ind.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                {/* 名前・種名 */}
                <h3 className="text-xl font-bold tracking-tight truncate text-slate-800">
                  {ind.name}
                </h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {SPECIES_SHORT[ind.species] ?? ind.species}
                </p>

                {/* モルフバッジ */}
                {ind.morph && (
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 mt-1">
                    {ind.morph}
                  </span>
                )}

                {/* ステータス行 */}
                <div className="flex items-center mt-2 text-xs font-medium text-slate-500">
                  {/* 性別 */}
                  {ind.sex && ind.sex !== '不明' && (
                    <>
                      <span
                        className={
                          ind.sex === 'オス'
                            ? 'text-blue-500 font-bold'
                            : 'text-pink-500 font-bold'
                        }
                      >
                        {ind.sex === 'オス' ? '♂' : '♀'}
                      </span>
                      <span className="w-[1px] h-3 bg-slate-200 mx-2" />
                    </>
                  )}

                  {/* 体重 */}
                  {ind.latest_weight_g != null && (
                    <>
                      <span className="text-slate-400">体重</span>
                      <span className="font-bold text-slate-800 ml-1">
                        {ind.latest_weight_g}
                      </span>
                      <span className="text-slate-400 ml-0.5">g</span>
                      <span className="w-[1px] h-3 bg-slate-200 mx-2" />
                    </>
                  )}

                  {/* 最終給餌 */}
                  {ind.latest_fed_at && (
                    <span className="text-primary font-bold">
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
                className="text-gray-300 shrink-0"
              />
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            {search || speciesFilter
              ? '該当する個体が見つかりません'
              : '個体が登録されていません'}
          </div>
        )}
      </div>

      {/* ═══ FAB（個体追加ボタン） ═══ */}
      <Link
        href="/individuals/new"
        className="fixed bottom-24 right-5 z-40 bg-slate-800 text-white rounded-full pl-5 pr-6 py-4 flex items-center gap-2 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.4)] active:scale-95 hover:-translate-y-1 transition-all"
      >
        <Plus size={20} />
        <span className="text-sm font-bold">個体を追加</span>
      </Link>
    </div>
  );
}
