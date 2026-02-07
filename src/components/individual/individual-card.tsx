import Link from 'next/link';
import { ChevronRight, CircleDot, CircleDashed, HelpCircle, Scale, Utensils } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface IndividualCardData {
  id: string;
  name: string;
  species: string;
  sex: string;
  morph: string;
  status: string;
  image_url: string | null;
  latest_weight_g?: number | null;
  latest_condition?: string | null;
  latest_fed_at?: string | null;
}

const SEX_ICON = {
  'オス': CircleDot,
  'メス': CircleDashed,
  '不明': HelpCircle,
} as const;

const CONDITION_COLOR: Record<string, string> = {
  '絶好調': '#059669',
  '普通':   '#2563eb',
  '不調':   '#e11d48',
};

const SPECIES_SHORT: Record<string, string> = {
  'ニシアフリカトカゲモドキ': 'ニシアフ',
  'ヒョウモントカゲモドキ':   'レオパ',
};

export function IndividualCard({ data }: { data: IndividualCardData }) {
  const SexIcon = SEX_ICON[data.sex as keyof typeof SEX_ICON] ?? HelpCircle;

  return (
    <Link
      href={`/individuals/${data.id}`}
      className="block rounded-[20px] bg-bg-secondary border border-border shadow-sm p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        {/* アバター */}
        <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex items-center justify-center overflow-hidden shrink-0">
          {data.image_url ? (
            <img src={data.image_url} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[20px] font-bold text-text-tertiary">
              {data.name.charAt(0)}
            </span>
          )}
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[16px] font-bold truncate">{data.name}</h3>
            <SexIcon size={14} className="text-text-tertiary shrink-0" />
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge color="#6b7280">
              {SPECIES_SHORT[data.species] ?? data.species}
            </Badge>
            {data.morph && (
              <Badge color="var(--accent-purple)">{data.morph}</Badge>
            )}
          </div>

          {/* ステータス行 */}
          <div className="flex items-center gap-3 mt-2 text-[12px] text-text-tertiary">
            {data.latest_weight_g != null && (
              <span className="flex items-center gap-0.5">
                <Scale size={12} />
                {data.latest_weight_g}g
              </span>
            )}
            {data.latest_condition && (
              <span
                className="flex items-center gap-0.5 font-medium"
                style={{ color: CONDITION_COLOR[data.latest_condition] }}
              >
                {data.latest_condition}
              </span>
            )}
            {data.latest_fed_at && (
              <span className="flex items-center gap-0.5">
                <Utensils size={12} />
                {formatDistanceToNow(new Date(data.latest_fed_at), { addSuffix: true, locale: ja })}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={18} className="text-text-tertiary mt-1 shrink-0" />
      </div>
    </Link>
  );
}
