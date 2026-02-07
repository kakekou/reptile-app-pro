'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { IndividualCard } from '@/components/individual/individual-card';
import { createClient } from '@/lib/supabase/client';

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

export default function IndividualsPage() {
  const [individuals, setIndividuals] = useState<IndividualRow[]>([]);
  const [search, setSearch] = useState('');

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

  const filtered = search
    ? individuals.filter(
        (i) =>
          i.name.includes(search) ||
          i.morph.includes(search) ||
          i.species.includes(search)
      )
    : individuals;

  return (
    <>
      <PageHeader
        title="個体一覧"
        subtitle={`${individuals.length}匹を飼育中`}
        action={
          <Link
            href="/individuals/new"
            className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center"
          >
            <Plus size={20} className="text-white" />
          </Link>
        }
      />

      <div className="px-5 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="名前・モルフで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[14px] bg-white border border-gray-300 pl-11 pr-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5">
        {filtered.map((ind) => (
          <IndividualCard key={ind.id} data={ind} />
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-tertiary text-[14px]">
            {search ? '該当する個体が見つかりません' : '個体が登録されていません'}
          </div>
        )}
      </div>
    </>
  );
}
