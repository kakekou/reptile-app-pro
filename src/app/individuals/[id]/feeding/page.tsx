'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Minus, Plus, Ban } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FoodGrid } from '@/components/individual/food-grid';
import { createClient } from '@/lib/supabase/client';
import type { FoodType } from '@/types/database';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface FeedingRecord {
  id: string;
  fed_at: string;
  food_type: string;
  quantity: number;
  refused: boolean;
  notes: string;
}

export default function FeedingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [foodType, setFoodType] = useState<FoodType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [refused, setRefused] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<FeedingRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, [id]);

  const loadHistory = () => {
    const supabase = createClient();
    supabase
      .from('feedings')
      .select('*')
      .eq('individual_id', id)
      .order('fed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data as FeedingRecord[]);
      });
  };

  const handleSubmit = async () => {
    if (!foodType) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('feedings').insert({
      user_id: user.id,
      individual_id: id,
      food_type: foodType,
      quantity: refused ? 0 : quantity,
      refused,
      notes,
    });

    setFoodType(null);
    setQuantity(1);
    setRefused(false);
    setNotes('');
    setLoading(false);
    loadHistory();
  };

  return (
    <>
      <PageHeader
        title="給餌記録"
        action={
          <Link href={`/individuals/${id}`} className="text-accent-blue text-[15px] font-medium flex items-center gap-1">
            <ArrowLeft size={16} />
            戻る
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-5">
        {/* 餌の選択 */}
        <Card>
          <h3 className="text-[14px] font-semibold mb-3">餌を選択</h3>
          <FoodGrid value={foodType} onChange={setFoodType} />
        </Card>

        {/* 数量と拒食 */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold">数量</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(0, quantity - 1))}
                className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center active:scale-90"
              >
                <Minus size={16} className="text-text-secondary" />
              </button>
              <span className="text-[20px] font-bold w-8 text-center">{refused ? 0 : quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center active:scale-90"
              >
                <Plus size={16} className="text-text-secondary" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setRefused(!refused)}
              className={`
                flex items-center gap-2 rounded-[14px] px-4 py-3 w-full transition-all
                ${refused ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-tertiary text-text-tertiary'}
              `}
            >
              <Ban size={16} />
              <span className="text-[14px] font-medium">拒食</span>
            </button>
          </div>
        </Card>

        {/* メモ */}
        <Card>
          <textarea
            placeholder="メモ（任意）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] bg-bg-tertiary px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none"
          />
        </Card>

        {/* 保存ボタン */}
        <div className="sticky bottom-20 z-10 pt-2 pb-4">
          <Button onClick={handleSubmit} fullWidth disabled={loading || !foodType}>
            <Save size={18} />
            {loading ? '保存中...' : '記録する'}
          </Button>
        </div>

        {/* 履歴 */}
        {history.length > 0 && (
          <div>
            <h3 className="text-[14px] font-semibold mb-3 text-text-secondary">最近の記録</h3>
            <div className="flex flex-col gap-2">
              {history.map((rec) => (
                <div key={rec.id} className="rounded-[14px] bg-bg-secondary p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-medium">
                      {rec.refused ? '拒食' : `${rec.food_type} × ${rec.quantity}`}
                    </span>
                    {rec.notes && (
                      <p className="text-[12px] text-text-tertiary mt-0.5">{rec.notes}</p>
                    )}
                  </div>
                  <span className="text-[12px] text-text-tertiary shrink-0">
                    {format(new Date(rec.fed_at), 'M/d HH:mm', { locale: ja })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
