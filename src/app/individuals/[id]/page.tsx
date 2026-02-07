'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Utensils,
  Scale,
  HeartPulse,
  TrendingUp,
  CircleDot,
  CircleDashed,
  HelpCircle,
  StickyNote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Individual } from '@/types/database';

const SEX_ICON = { 'オス': CircleDot, 'メス': CircleDashed, '不明': HelpCircle };
const CONDITION_COLORS: Record<string, string> = { '絶好調': '#059669', '普通': '#2563eb', '不調': '#e11d48' };
const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ': 'レオパ',
};

interface LatestData {
  weight_g: number | null;
  length_cm: number | null;
  condition: string | null;
  fed_at: string | null;
  food_type: string | null;
}

export default function IndividualDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [individual, setIndividual] = useState<Individual | null>(null);
  const [latest, setLatest] = useState<LatestData>({
    weight_g: null, length_cm: null, condition: null, fed_at: null, food_type: null,
  });

  useEffect(() => {
    const supabase = createClient();

    supabase.from('individuals').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setIndividual(data as Individual);
    });

    supabase.from('individuals_with_latest').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const d = data as Record<string, unknown>;
        setLatest({
          weight_g: d.latest_weight_g as number | null,
          length_cm: d.latest_length_cm as number | null,
          condition: d.latest_condition as string | null,
          fed_at: d.latest_fed_at as string | null,
          food_type: d.latest_food_type as string | null,
        });
      }
    });
  }, [id]);

  if (!individual) {
    return (
      <div className="flex items-center justify-center min-h-dvh text-text-tertiary">
        読み込み中...
      </div>
    );
  }

  const SexIcon = SEX_ICON[individual.sex as keyof typeof SEX_ICON] ?? HelpCircle;

  const quickActions = [
    { href: `/individuals/${id}/feeding`, icon: Utensils,   label: '給餌記録',   color: '#059669' },
    { href: `/individuals/${id}/health`,  icon: HeartPulse, label: '体調記録',   color: '#e11d48' },
    { href: `/individuals/${id}/growth`,  icon: TrendingUp, label: '成長分析',   color: '#2563eb' },
  ];

  return (
    <>
      <PageHeader
        title={individual.name}
        action={
          <Link href="/individuals" className="text-accent-blue text-[15px] font-medium flex items-center gap-1">
            <ArrowLeft size={16} />
            一覧
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-5">
        {/* プロフィールカード */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">
              {individual.image_url ? (
                <img src={individual.image_url} alt={individual.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[32px] font-bold text-text-tertiary">
                  {individual.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold">{individual.name}</h2>
                <SexIcon size={16} className="text-text-secondary" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge color="#6b7280">{SPECIES_SHORT[individual.species]}</Badge>
                {individual.morph && <Badge color="var(--accent-purple)">{individual.morph}</Badge>}
                <Badge color="#059669">{individual.status}</Badge>
              </div>
              {individual.birth_date && (
                <p className="text-[12px] text-text-tertiary mt-2">
                  ハッチ日: {format(new Date(individual.birth_date), 'yyyy年M月d日', { locale: ja })}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* 最新ステータス */}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat
            icon={<Scale size={16} />}
            label="体重"
            value={latest.weight_g != null ? `${latest.weight_g}g` : '--'}
            color="#2563eb"
          />
          <MiniStat
            icon={<HeartPulse size={16} />}
            label="体調"
            value={latest.condition ?? '--'}
            color={CONDITION_COLORS[latest.condition ?? ''] ?? '#6b7280'}
          />
          <MiniStat
            icon={<Utensils size={16} />}
            label="最終給餌"
            value={latest.fed_at ? formatDistanceToNow(new Date(latest.fed_at), { addSuffix: true, locale: ja }) : '--'}
            color="#059669"
          />
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-[16px] bg-bg-secondary border border-border shadow-sm p-4 active:scale-95 transition-transform"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}10` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <span className="text-[12px] font-medium text-text-secondary">{label}</span>
            </Link>
          ))}
        </div>

        {/* メモ */}
        {individual.notes && (
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={16} className="text-accent-orange" />
              <span className="text-[14px] font-semibold">メモ</span>
            </div>
            <p className="text-[14px] text-text-secondary whitespace-pre-wrap">{individual.notes}</p>
          </Card>
        )}
      </div>
    </>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border shadow-sm p-3 flex flex-col items-center gap-1">
      <div style={{ color }}>{icon}</div>
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className="text-[14px] font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
