'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Scale, Ruler, Save } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GrowthChart } from '@/components/individual/growth-chart';
import { createClient } from '@/lib/supabase/client';

interface MeasurementRecord {
  measured_on: string;
  weight_g: number | null;
  length_cm: number | null;
}

export default function GrowthPage() {
  const params = useParams();
  const id = params.id as string;

  const [metric, setMetric] = useState<'weight' | 'length'>('weight');
  const [data, setData] = useState<MeasurementRecord[]>([]);
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = () => {
    const supabase = createClient();
    supabase
      .from('measurements')
      .select('measured_on, weight_g, length_cm')
      .eq('individual_id', id)
      .order('measured_on', { ascending: true })
      .then(({ data }) => {
        if (data) setData(data as MeasurementRecord[]);
      });
  };

  const handleSubmit = async () => {
    const w = weight ? parseFloat(weight) : null;
    const l = length ? parseFloat(length) : null;
    if (w === null && l === null) return;

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('measurements').insert({
      user_id: user.id,
      individual_id: id,
      weight_g: w,
      length_cm: l,
    });

    setWeight('');
    setLength('');
    setLoading(false);
    loadData();
  };

  return (
    <>
      <PageHeader
        title="成長分析"
        action={
          <Link href={`/individuals/${id}`} className="text-accent-blue text-[15px] font-medium flex items-center gap-1">
            <ArrowLeft size={16} />
            戻る
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-5">
        {/* メトリック切替 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMetric('weight')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-3 text-[14px] font-semibold transition-all ${
              metric === 'weight' ? 'bg-accent-blue text-white' : 'bg-bg-tertiary text-text-tertiary'
            }`}
          >
            <Scale size={16} />
            体重 (g)
          </button>
          <button
            type="button"
            onClick={() => setMetric('length')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-[14px] py-3 text-[14px] font-semibold transition-all ${
              metric === 'length' ? 'bg-accent-green text-white' : 'bg-bg-tertiary text-text-tertiary'
            }`}
          >
            <Ruler size={16} />
            体長 (cm)
          </button>
        </div>

        {/* チャート */}
        <Card>
          <GrowthChart data={data} metric={metric} />
        </Card>

        {/* 入力 */}
        <Card>
          <h3 className="text-[14px] font-semibold mb-3">新しい計測を記録</h3>
          <div className="flex gap-3">
            <Input
              label="体重 (g)"
              type="number"
              step="0.1"
              min="0"
              placeholder="例: 45.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1"
            />
            <Input
              label="体長 (cm)"
              type="number"
              step="0.1"
              min="0"
              placeholder="例: 18.0"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        <div className="sticky bottom-20 z-10 pt-2 pb-4">
          <Button onClick={handleSubmit} fullWidth disabled={loading || (!weight && !length)}>
            <Save size={18} />
            {loading ? '保存中...' : '記録する'}
          </Button>
        </div>
      </div>
    </>
  );
}
