'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Camera } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { SPECIES_OPTIONS, SEX_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';
import type { Species, Sex } from '@/types/database';

export default function NewIndividualPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    species: 'ニシアフリカトカゲモドキ' as Species,
    sex: '不明' as Sex,
    morph: '',
    birth_date: '',
    acquired_on: '',
    source: '',
    notes: '',
  });

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('individuals').insert({
      user_id: user.id,
      name: form.name,
      species: form.species,
      sex: form.sex,
      morph: form.morph,
      birth_date: form.birth_date || null,
      acquired_on: form.acquired_on || null,
      source: form.source,
      notes: form.notes,
    });

    if (!error) {
      router.push('/individuals');
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <>
      <PageHeader
        title="新規登録"
        action={
          <Link href="/individuals" className="text-accent-blue text-[15px] font-medium flex items-center gap-1">
            <ArrowLeft size={16} />
            戻る
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5">
        <Card>
          <div className="flex flex-col gap-4">
            <Input
              label="名前"
              placeholder="個体名を入力"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />

            <Select
              label="種類"
              options={SPECIES_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
              value={form.species}
              onChange={(e) => update('species', e.target.value)}
            />

            {/* 性別セレクタ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-secondary">性別</label>
              <div className="flex gap-2">
                {SEX_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('sex', opt.value)}
                    className={`
                      flex-1 rounded-[14px] py-3 text-[14px] font-semibold transition-all
                      ${form.sex === opt.value
                        ? 'bg-accent-blue text-white'
                        : 'bg-bg-tertiary text-text-tertiary'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="モルフ"
              placeholder="例: オレオ het.キャラメル"
              value={form.morph}
              onChange={(e) => update('morph', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4">
            <Input
              label="ハッチ日 / 生年月日"
              type="date"
              value={form.birth_date}
              onChange={(e) => update('birth_date', e.target.value)}
            />

            <Input
              label="入手日"
              type="date"
              value={form.acquired_on}
              onChange={(e) => update('acquired_on', e.target.value)}
            />

            <Input
              label="入手元"
              placeholder="例: ○○レプタイルズ"
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-secondary">メモ</label>
            <textarea
              placeholder="自由にメモを入力..."
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="rounded-[14px] bg-bg-tertiary px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none"
            />
          </div>
        </Card>

        {/* 保存ボタン: sticky でスマホでも隠れない */}
        <div className="sticky bottom-20 z-10 pt-2 pb-4">
          <Button type="submit" fullWidth disabled={loading || !form.name}>
            <Save size={18} />
            {loading ? '保存中...' : '保存する'}
          </Button>
        </div>
      </form>
    </>
  );
}
