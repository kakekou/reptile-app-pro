'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Delete, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── 定数 ──────────────────────────────────────────────

const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ': 'レオパ',
};

const FOOD_TYPE_OPTIONS = [
  'コオロギ',
  'デュビア',
  'ミルワーム',
  '人工フード',
  'ピンクマウス',
  'その他',
];

// ── メインコンテンツ ──────────────────────────────────

function FeedingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const individualId = searchParams.get('individual_id') ?? '';
  const dateParam = searchParams.get('date') ?? '';

  // 個体情報
  const [individual, setIndividual] = useState<{
    name: string;
    species: string;
    image_url: string | null;
  } | null>(null);

  // フォーム
  const [selectedFood, setSelectedFood] = useState('コオロギ');
  const [quantityStr, setQuantityStr] = useState('0');
  const [unit, setUnit] = useState<'個' | 'g'>('個');
  const [supplements, setSupplements] = useState({ calcium: false, vitamin: false });
  const [memo, setMemo] = useState('');

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── 個体情報の取得 ──
  useEffect(() => {
    if (!individualId) return;
    const supabase = createClient();
    supabase
      .from('individuals')
      .select('name, species, image_url')
      .eq('id', individualId)
      .single()
      .then(({ data }) => {
        if (data) setIndividual(data);
      });
  }, [individualId]);

  // ── テンキー入力 ──
  function handleNumpadPress(key: string) {
    setError('');
    setQuantityStr((prev) => {
      if (key === 'backspace') {
        const next = prev.slice(0, -1);
        return next === '' ? '0' : next;
      }
      if (key === '.') {
        if (unit === '個') return prev;
        if (prev.includes('.')) return prev;
        return prev + '.';
      }
      // 数字
      if (prev === '0') return key;
      if (prev.length >= 6) return prev;
      return prev + key;
    });
  }

  // ── 保存処理 ──
  async function handleSave() {
    const quantity = parseFloat(quantityStr);
    if (!quantity || quantity <= 0) {
      setError('数量を入力してください');
      return;
    }
    if (!individualId) {
      setError('個体が選択されていません');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('認証エラー');
        setSaving(false);
        return;
      }

      const fedAt = dateParam
        ? `${dateParam}T${new Date().toTimeString().slice(0, 8)}`
        : new Date().toISOString();

      const { error: insertError } = await supabase.from('feedings').insert({
        user_id: user.id,
        individual_id: individualId,
        fed_at: fedAt,
        food_type: selectedFood,
        quantity,
        dusting: supplements.calcium || supplements.vitamin,
        refused: false,
        notes: memo,
      });

      if (insertError) {
        setError('保存に失敗しました');
        setSaving(false);
        return;
      }

      router.back();
    } catch {
      setError('保存に失敗しました');
      setSaving(false);
    }
  }

  // ── 描画 ──
  return (
    <div className="bg-[#f6f8f7] min-h-dvh flex flex-col">
      {/* ═══ ヘッダー ═══ */}
      <header className="sticky top-0 z-40 bg-[#f6f8f7] px-4 flex items-center justify-between h-14">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-center text-slate-900">
          給餌の記録
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-primary text-base font-bold disabled:opacity-50 transition-opacity"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </header>

      {/* ═══ 個体情報カード ═══ */}
      {individual && (
        <div className="mx-4 mt-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 shrink-0">
            {individual.image_url ? (
              <img
                src={individual.image_url}
                alt={individual.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-slate-200 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-400">
                  {individual.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{individual.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {SPECIES_SHORT[individual.species] ?? individual.species}
            </p>
          </div>
        </div>
      )}

      {/* ═══ 餌の種類セレクター ═══ */}
      <div className="mt-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-6 mb-3">
          餌の種類
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
          {FOOD_TYPE_OPTIONS.map((food) => (
            <button
              key={food}
              onClick={() => setSelectedFood(food)}
              className={`h-10 px-5 rounded-xl text-sm whitespace-nowrap shrink-0 transition-all ${
                selectedFood === food
                  ? 'bg-primary text-white font-bold shadow-sm ring-1 ring-primary/20'
                  : 'bg-white text-slate-800 font-medium border border-gray-100'
              }`}
            >
              {food}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 数量入力ディスプレイ ═══ */}
      <div className="mt-10 mb-6 flex flex-col items-center justify-center">
        <div className="flex items-end gap-2">
          <span className="text-7xl font-bold tabular-nums text-slate-900">
            {quantityStr}
          </span>
          {/* 単位トグル */}
          <div className="bg-gray-200/50 p-1 rounded-lg flex mb-3">
            <button
              onClick={() => {
                setUnit('個');
                setQuantityStr((prev) => {
                  const idx = prev.indexOf('.');
                  return idx >= 0 ? prev.slice(0, idx) || '0' : prev;
                });
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                unit === '個'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-gray-500'
              }`}
            >
              個
            </button>
            <button
              onClick={() => setUnit('g')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                unit === 'g'
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-gray-500'
              }`}
            >
              g
            </button>
          </div>
        </div>
        <div className="w-12 h-1 bg-primary rounded-full mt-2 opacity-30" />
        {error && (
          <p className="text-xs text-red-500 font-medium mt-2">{error}</p>
        )}
      </div>

      {/* ═══ サプリメント選択 ═══ */}
      <div className="px-6 mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
          サプリメント
        </p>
        <div className="flex gap-3">
          <button
            onClick={() =>
              setSupplements((prev) => ({ ...prev, calcium: !prev.calcium }))
            }
            className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
              supplements.calcium
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-white border-gray-100 text-gray-400'
            }`}
          >
            {supplements.calcium && <Check size={16} />}
            <span className="text-sm font-bold">カルシウム</span>
          </button>
          <button
            onClick={() =>
              setSupplements((prev) => ({ ...prev, vitamin: !prev.vitamin }))
            }
            className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
              supplements.vitamin
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-white border-gray-100 text-gray-400'
            }`}
          >
            {supplements.vitamin && <Check size={16} />}
            <span className="text-sm font-bold">ビタミン</span>
          </button>
        </div>
      </div>

      {/* ═══ メモ入力 ═══ */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力..."
            rows={2}
            className="w-full bg-transparent border-none p-0 text-sm text-slate-900 placeholder:text-gray-400 outline-none resize-none"
          />
        </div>
      </div>

      {/* スペーサー（テンキーを下部に配置） */}
      <div className="flex-1" />

      {/* ═══ カスタムテンキー ═══ */}
      <div className="px-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpadPress(key)}
              className="aspect-[1.5/1] bg-white border border-gray-100 rounded-xl flex items-center justify-center text-xl font-bold text-slate-900 active:bg-gray-100 transition-colors"
            >
              {key}
            </button>
          ))}
          {/* 小数点 */}
          <button
            onClick={() => handleNumpadPress('.')}
            disabled={unit === '個'}
            className={`aspect-[1.5/1] bg-white border border-gray-100 rounded-xl flex items-center justify-center text-xl font-bold transition-colors ${
              unit === '個'
                ? 'text-gray-200 cursor-not-allowed'
                : 'text-slate-900 active:bg-gray-100'
            }`}
          >
            .
          </button>
          {/* 0 */}
          <button
            onClick={() => handleNumpadPress('0')}
            className="aspect-[1.5/1] bg-white border border-gray-100 rounded-xl flex items-center justify-center text-xl font-bold text-slate-900 active:bg-gray-100 transition-colors"
          >
            0
          </button>
          {/* バックスペース */}
          <button
            onClick={() => handleNumpadPress('backspace')}
            className="aspect-[1.5/1] bg-gray-100 border border-gray-100 rounded-xl flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            <Delete size={22} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* ═══ ボトムセーフエリア ═══ */}
      <div className="h-8 bg-[#f6f8f7] flex justify-center items-end pb-2">
        <div className="w-32 h-1.5 bg-gray-300 rounded-full" />
      </div>
    </div>
  );
}

// ── ページエクスポート（Suspense境界） ────────────────

export default function FeedingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh bg-[#f6f8f7] text-slate-400">
          読み込み中...
        </div>
      }
    >
      <FeedingPageContent />
    </Suspense>
  );
}
