-- ============================================================
-- ReptiLog - 爬虫類ブリーダー管理アプリ
-- Supabase SQL Editor 最終版
-- 実行方法: SQL Editor に全文を貼り付けて「Run」
-- ============================================================
-- 注意: このスクリプトは冪等ではありません（初回のみ実行）
-- 再実行する場合は先に全テーブルを DROP してください
-- ============================================================


-- ************************************************************
-- PART 1: テーブル定義
-- ************************************************************

-- -----------------------------------------------
-- 1. 個体マスタ (individuals)
-- -----------------------------------------------
create table public.individuals (
  id           bigint generated always as identity primary key,
  user_id      uuid    not null references auth.users(id) on delete cascade,
  name         text    not null,
  species      text    not null
                 check (species in ('ニシアフリカトカゲモドキ', 'ヒョウモントカゲモドキ')),
  sex          text    not null default '不明'
                 check (sex in ('オス', 'メス', '不明')),
  morph        text    not null default '',
  genes        jsonb   not null default '[]'::jsonb,
  birth_date   date,
  acquired_on  date,
  source       text    not null default '',
  image_url    text,
  status       text    not null default '飼育中'
                 check (status in ('飼育中', '売約済み', '譲渡済み', '死亡')),
  notes        text    not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.individuals         is '個体マスタ';
comment on column public.individuals.species is '種類 (ニシアフ / レオパ)';
comment on column public.individuals.genes   is 'モルフ遺伝子情報 [{locus,mode,copies}]';
comment on column public.individuals.status  is '飼育ステータス';

-- -----------------------------------------------
-- 2. 給餌記録 (feedings)
-- -----------------------------------------------
create table public.feedings (
  id             bigint generated always as identity primary key,
  user_id        uuid    not null references auth.users(id) on delete cascade,
  individual_id  bigint  not null references public.individuals(id) on delete cascade,
  fed_at         timestamptz not null default now(),
  food_type      text    not null
                   check (food_type in (
                     'コオロギ', 'デュビア', 'ミルワーム', 'ハニーワーム',
                     'シルクワーム', 'ピンクマウス', '人工フード', 'その他'
                   )),
  quantity       int     not null default 1  check (quantity >= 0),
  refused        boolean not null default false,
  notes          text    not null default '',
  created_at     timestamptz not null default now()
);

comment on table  public.feedings           is '給餌記録';
comment on column public.feedings.food_type is '餌の種類 (8種)';
comment on column public.feedings.refused   is '拒食フラグ';

-- -----------------------------------------------
-- 3. 体重・体長の計測記録 (measurements)
-- -----------------------------------------------
create table public.measurements (
  id             bigint generated always as identity primary key,
  user_id        uuid    not null references auth.users(id) on delete cascade,
  individual_id  bigint  not null references public.individuals(id) on delete cascade,
  measured_on    date    not null default current_date,
  weight_g       numeric(7,2) check (weight_g > 0),
  length_cm      numeric(5,1) check (length_cm > 0),
  notes          text    not null default '',
  created_at     timestamptz not null default now(),

  -- 体重か体長のどちらかは必須
  constraint measurements_has_value
    check (weight_g is not null or length_cm is not null)
);

comment on table  public.measurements           is '計測記録';
comment on column public.measurements.weight_g  is '体重 (g)';
comment on column public.measurements.length_cm is '体長 (cm)';

-- -----------------------------------------------
-- 4. 体調記録 (health_logs)
-- -----------------------------------------------
create table public.health_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid    not null references auth.users(id) on delete cascade,
  individual_id  bigint  not null references public.individuals(id) on delete cascade,
  logged_on      date    not null default current_date,
  condition      text    not null
                   check (condition in ('絶好調', '普通', '不調')),
  symptoms       text[]  not null default '{}',
  notes          text    not null default '',
  created_at     timestamptz not null default now()
);

comment on table  public.health_logs           is '体調記録';
comment on column public.health_logs.condition is '体調レベル (3段階)';
comment on column public.health_logs.symptoms  is '症状タグ配列';

-- -----------------------------------------------
-- 5. 脱皮記録 (sheds)
-- -----------------------------------------------
create table public.sheds (
  id             bigint generated always as identity primary key,
  user_id        uuid    not null references auth.users(id) on delete cascade,
  individual_id  bigint  not null references public.individuals(id) on delete cascade,
  shed_on        date    not null default current_date,
  completeness   text    not null default '完全'
                   check (completeness in ('完全', '不完全')),
  notes          text    not null default '',
  created_at     timestamptz not null default now()
);

comment on table public.sheds is '脱皮記録';

-- -----------------------------------------------
-- 6. ペアリング記録 (pairings)
-- -----------------------------------------------
create table public.pairings (
  id          bigint generated always as identity primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  male_id     bigint  not null references public.individuals(id) on delete cascade,
  female_id   bigint  not null references public.individuals(id) on delete cascade,
  paired_on   date    not null default current_date,
  confirmed   boolean not null default false,
  notes       text    not null default '',
  created_at  timestamptz not null default now(),

  -- 同一個体のペアリングを禁止
  constraint pairings_different_individuals
    check (male_id <> female_id)
);

comment on table  public.pairings           is 'ペアリング記録';
comment on column public.pairings.confirmed is '交尾確認フラグ';

-- -----------------------------------------------
-- 7. クラッチ・産卵記録 (clutches)
-- -----------------------------------------------
create table public.clutches (
  id                bigint generated always as identity primary key,
  user_id           uuid    not null references auth.users(id) on delete cascade,
  pairing_id        bigint  not null references public.pairings(id) on delete cascade,
  laid_on           date    not null default current_date,
  egg_count         int     not null default 0 check (egg_count >= 0),
  fertile_count     int     not null default 0 check (fertile_count >= 0),
  hatched_on        date,
  hatch_count       int     not null default 0 check (hatch_count >= 0),
  incubation_temp_c numeric(4,1),
  notes             text    not null default '',
  created_at        timestamptz not null default now(),

  -- 有精卵数 <= 産卵数
  constraint clutches_fertile_lte_eggs
    check (fertile_count <= egg_count),
  -- 孵化数 <= 有精卵数
  constraint clutches_hatch_lte_fertile
    check (hatch_count <= fertile_count)
);

comment on table  public.clutches                   is 'クラッチ（産卵）記録';
comment on column public.clutches.incubation_temp_c is 'インキュベーション温度 (℃)';

-- -----------------------------------------------
-- 8. 汎用メモ (memos)
-- -----------------------------------------------
create table public.memos (
  id             bigint generated always as identity primary key,
  user_id        uuid    not null references auth.users(id) on delete cascade,
  individual_id  bigint  references public.individuals(id) on delete cascade,
  title          text    not null default '',
  body           text    not null default '',
  pinned         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.memos is '汎用メモ (個体紐付け任意)';


-- ************************************************************
-- PART 2: インデックス
-- ************************************************************

create index idx_individuals_user       on public.individuals  (user_id);
create index idx_individuals_status     on public.individuals  (user_id, status);
create index idx_feedings_indiv_date    on public.feedings     (individual_id, fed_at desc);
create index idx_feedings_user_date     on public.feedings     (user_id, fed_at desc);
create index idx_measurements_indiv     on public.measurements (individual_id, measured_on desc);
create index idx_health_logs_indiv      on public.health_logs  (individual_id, logged_on desc);
create index idx_sheds_indiv            on public.sheds        (individual_id, shed_on desc);
create index idx_pairings_user          on public.pairings     (user_id);
create index idx_pairings_male          on public.pairings     (male_id);
create index idx_pairings_female        on public.pairings     (female_id);
create index idx_clutches_pairing       on public.clutches     (pairing_id);
create index idx_memos_indiv            on public.memos        (individual_id);
create index idx_memos_user_pinned      on public.memos        (user_id, pinned desc, created_at desc);


-- ************************************************************
-- PART 3: Row Level Security (RLS)
-- ************************************************************

alter table public.individuals  enable row level security;
alter table public.feedings     enable row level security;
alter table public.measurements enable row level security;
alter table public.health_logs  enable row level security;
alter table public.sheds        enable row level security;
alter table public.pairings     enable row level security;
alter table public.clutches     enable row level security;
alter table public.memos        enable row level security;

-- 各テーブルに操作別ポリシーを作成
-- SELECT: 自分のデータのみ参照可能
-- INSERT: user_id が自分であること
-- UPDATE: 自分のデータのみ更新可能
-- DELETE: 自分のデータのみ削除可能
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'individuals', 'feedings', 'measurements',
      'health_logs', 'sheds', 'pairings', 'clutches', 'memos'
    ])
  loop
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      tbl || '_select', tbl
    );
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      tbl || '_insert', tbl
    );
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tbl || '_update', tbl
    );
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      tbl || '_delete', tbl
    );
  end loop;
end $$;


-- ************************************************************
-- PART 4: トリガー (updated_at 自動更新)
-- ************************************************************

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_individuals_update
  before update on public.individuals
  for each row execute function public.handle_updated_at();

create trigger on_memos_update
  before update on public.memos
  for each row execute function public.handle_updated_at();


-- ************************************************************
-- PART 5: Storage バケット (個体画像)
-- ************************************************************

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'individual-images',
  'individual-images',
  true,
  5242880,  -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS: 認証ユーザーは自分のフォルダにのみアップロード/削除可能
create policy "individual_images_select"
  on storage.objects for select
  using (bucket_id = 'individual-images');

create policy "individual_images_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'individual-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "individual_images_update"
  on storage.objects for update
  using (
    bucket_id = 'individual-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "individual_images_delete"
  on storage.objects for delete
  using (
    bucket_id = 'individual-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ************************************************************
-- PART 6: ビュー (ダッシュボード用)
-- ************************************************************

-- 個体ごとの最新体重・最新体調を付与するビュー
create or replace view public.individuals_with_latest as
select
  i.*,
  lm.weight_g   as latest_weight_g,
  lm.length_cm  as latest_length_cm,
  lm.measured_on as latest_measured_on,
  lh.condition   as latest_condition,
  lh.logged_on   as latest_condition_on,
  lf.fed_at      as latest_fed_at,
  lf.food_type   as latest_food_type
from public.individuals i
left join lateral (
  select m.weight_g, m.length_cm, m.measured_on
  from public.measurements m
  where m.individual_id = i.id
  order by m.measured_on desc
  limit 1
) lm on true
left join lateral (
  select h.condition, h.logged_on
  from public.health_logs h
  where h.individual_id = i.id
  order by h.logged_on desc
  limit 1
) lh on true
left join lateral (
  select f.fed_at, f.food_type
  from public.feedings f
  where f.individual_id = i.id
  order by f.fed_at desc
  limit 1
) lf on true;

comment on view public.individuals_with_latest is '個体 + 最新計測/体調/給餌 (ダッシュボード用)';


-- ************************************************************
-- PART 7: RPC 関数 (ダッシュボード統計)
-- ************************************************************

-- ダッシュボード用の集計を一括取得する関数
create or replace function public.get_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  uid uuid := auth.uid();
begin
  select json_build_object(
    'total_individuals',
      (select count(*) from individuals where user_id = uid and status = '飼育中'),
    'total_males',
      (select count(*) from individuals where user_id = uid and status = '飼育中' and sex = 'オス'),
    'total_females',
      (select count(*) from individuals where user_id = uid and status = '飼育中' and sex = 'メス'),
    'total_unknown_sex',
      (select count(*) from individuals where user_id = uid and status = '飼育中' and sex = '不明'),
    'feedings_today',
      (select count(*) from feedings where user_id = uid and fed_at::date = current_date),
    'feedings_this_week',
      (select count(*) from feedings where user_id = uid and fed_at >= date_trunc('week', current_date)),
    'unhealthy_count',
      (select count(distinct h.individual_id)
       from health_logs h
       inner join lateral (
         select h2.id from health_logs h2
         where h2.individual_id = h.individual_id
         order by h2.logged_on desc limit 1
       ) latest on latest.id = h.id
       where h.user_id = uid and h.condition = '不調'),
    'active_pairings',
      (select count(*) from pairings where user_id = uid and confirmed = false),
    'recent_sheds_7d',
      (select count(*) from sheds where user_id = uid and shed_on >= current_date - interval '7 days')
  ) into result;

  return result;
end;
$$;

comment on function public.get_dashboard_stats() is 'ダッシュボード用の統計データを一括取得';


-- 特定月のイベントデータを取得する関数 (ミニカレンダー用)
create or replace function public.get_monthly_events(target_year int, target_month int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  uid uuid := auth.uid();
  start_date date := make_date(target_year, target_month, 1);
  end_date date := (make_date(target_year, target_month, 1) + interval '1 month')::date;
begin
  select json_build_object(
    'feeding_dates',
      (select coalesce(json_agg(distinct fed_at::date), '[]'::json)
       from feedings where user_id = uid and fed_at::date >= start_date and fed_at::date < end_date),
    'health_dates',
      (select coalesce(json_agg(distinct logged_on), '[]'::json)
       from health_logs where user_id = uid and logged_on >= start_date and logged_on < end_date),
    'shed_dates',
      (select coalesce(json_agg(distinct shed_on), '[]'::json)
       from sheds where user_id = uid and shed_on >= start_date and shed_on < end_date),
    'measurement_dates',
      (select coalesce(json_agg(distinct measured_on), '[]'::json)
       from measurements where user_id = uid and measured_on >= start_date and measured_on < end_date)
  ) into result;

  return result;
end;
$$;

comment on function public.get_monthly_events(int, int) is '月別イベント日付一覧 (カレンダードット用)';


-- ************************************************************
-- 完了
-- ************************************************************
-- 実行後、Supabase ダッシュボードの Authentication > Settings で
-- メール認証またはマジックリンク認証を有効にしてください。
-- ************************************************************
