'use client';

import { useState, useEffect } from 'react';
import { Heart, Plus, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

interface PairingWithNames {
  id: string;
  paired_on: string;
  confirmed: boolean;
  notes: string;
  male: { id: string; name: string; morph: string } | null;
  female: { id: string; name: string; morph: string } | null;
}

export default function BreedingPage() {
  const [pairings, setPairings] = useState<PairingWithNames[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('pairings')
      .select(`
        id, paired_on, confirmed, notes,
        male:individuals!pairings_male_id_fkey(id, name, morph),
        female:individuals!pairings_female_id_fkey(id, name, morph)
      `)
      .order('paired_on', { ascending: false })
      .then(({ data }) => {
        if (data) setPairings(data as unknown as PairingWithNames[]);
      });
  }, []);

  return (
    <>
      <PageHeader
        title="繁殖管理"
        subtitle={`${pairings.length}件のペアリング`}
        action={
          <Link
            href="/breeding/calculator"
            className="text-accent-blue text-[14px] font-medium"
          >
            計算機
          </Link>
        }
      />

      <div className="flex flex-col gap-3 px-5">
        {pairings.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart size={16} className={p.confirmed ? 'text-accent-red' : 'text-text-tertiary'} />
                <Badge color={p.confirmed ? '#30d158' : '#ff9f0a'}>
                  {p.confirmed ? '確認済み' : '未確認'}
                </Badge>
              </div>
              <span className="text-[12px] text-text-tertiary">
                {format(new Date(p.paired_on), 'yyyy/M/d', { locale: ja })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-[12px] bg-bg-tertiary p-3 text-center">
                <p className="text-[11px] text-accent-blue font-medium">オス</p>
                <p className="text-[14px] font-bold mt-0.5">{p.male?.name ?? '--'}</p>
                {p.male?.morph && (
                  <p className="text-[11px] text-text-tertiary mt-0.5">{p.male.morph}</p>
                )}
              </div>

              <ArrowRight size={16} className="text-text-tertiary shrink-0" />

              <div className="flex-1 rounded-[12px] bg-bg-tertiary p-3 text-center">
                <p className="text-[11px] text-accent-red font-medium">メス</p>
                <p className="text-[14px] font-bold mt-0.5">{p.female?.name ?? '--'}</p>
                {p.female?.morph && (
                  <p className="text-[11px] text-text-tertiary mt-0.5">{p.female.morph}</p>
                )}
              </div>
            </div>

            {p.notes && (
              <p className="text-[12px] text-text-tertiary mt-2">{p.notes}</p>
            )}
          </Card>
        ))}

        {pairings.length === 0 && (
          <div className="text-center py-16 text-text-tertiary text-[14px]">
            ペアリング記録がありません
          </div>
        )}
      </div>
    </>
  );
}
