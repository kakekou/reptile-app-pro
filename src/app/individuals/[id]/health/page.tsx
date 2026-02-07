'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConditionSelector } from '@/components/individual/condition-selector';
import { createClient } from '@/lib/supabase/client';
import { SYMPTOM_TAGS } from '@/lib/constants';
import type { ConditionLevel } from '@/types/database';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const CONDITION_COLORS: Record<string, string> = {
  '絶好調': '#059669',
  '普通': '#2563eb',
  '不調': '#e11d48',
};

interface HealthRecord {
  id: string;
  logged_on: string;
  condition: string;
  symptoms: string[];
  notes: string;
}

export default function HealthPage() {
  const params = useParams();
  const id = params.id as string;

  const [condition, setCondition] = useState<ConditionLevel | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HealthRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, [id]);

  const loadHistory = () => {
    const supabase = createClient();
    supabase
      .from('health_logs')
      .select('*')
      .eq('individual_id', id)
      .order('logged_on', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data as HealthRecord[]);
      });
  };

  const toggleSymptom = (tag: string) => {
    setSymptoms((prev) =>
      prev.includes(tag) ? prev.filter((s) => s !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!condition) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('health_logs').insert({
      user_id: user.id,
      individual_id: id,
      condition,
      symptoms,
      notes,
    });

    setCondition(null);
    setSymptoms([]);
    setNotes('');
    setLoading(false);
    loadHistory();
  };

  return (
    <>
      <PageHeader
        title="体調記録"
        action={
          <Link href={`/individuals/${id}`} className="text-accent-blue text-[15px] font-medium flex items-center gap-1">
            <ArrowLeft size={16} />
            戻る
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-5">
        {/* 体調セレクタ */}
        <Card>
          <h3 className="text-[14px] font-semibold mb-3">今の体調</h3>
          <ConditionSelector value={condition} onChange={setCondition} />
        </Card>

        {/* 症状タグ */}
        <Card>
          <h3 className="text-[14px] font-semibold mb-3">症状（該当するものを選択）</h3>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_TAGS.map((tag) => {
              const selected = symptoms.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSymptom(tag)}
                  className={`
                    rounded-full px-3 py-1.5 text-[13px] font-medium transition-all
                    ${selected
                      ? 'bg-accent-red/10 text-accent-red ring-1 ring-accent-red/30'
                      : 'bg-bg-tertiary text-text-tertiary'
                    }
                  `}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Card>

        {/* メモ */}
        <Card>
          <textarea
            placeholder="メモ（任意）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[14px] bg-white border border-gray-300 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue resize-none"
          />
        </Card>

        {/* 保存ボタン */}
        <div className="sticky bottom-20 z-10 pt-2 pb-4">
          <Button onClick={handleSubmit} fullWidth disabled={loading || !condition}>
            <Save size={18} />
            {loading ? '保存中...' : '記録する'}
          </Button>
        </div>

        {/* 履歴 */}
        {history.length > 0 && (
          <div>
            <h3 className="text-[14px] font-semibold mb-3 text-text-secondary">過去の記録</h3>
            <div className="flex flex-col gap-2">
              {history.map((rec) => (
                <div key={rec.id} className="rounded-[14px] bg-bg-secondary border border-border shadow-sm p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: CONDITION_COLORS[rec.condition] }}
                    >
                      {rec.condition}
                    </span>
                    <span className="text-[12px] text-text-tertiary">
                      {format(new Date(rec.logged_on), 'yyyy/M/d', { locale: ja })}
                    </span>
                  </div>
                  {rec.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.symptoms.map((s) => (
                        <span key={s} className="text-[11px] text-accent-red bg-accent-red/10 rounded-full px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {rec.notes && (
                    <p className="text-[12px] text-text-tertiary mt-1">{rec.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
