-- =========================================================
-- ボカロ曲 一括投入（staging テーブル方式）
--
-- 前提: migration_vocaloid_songs.sql の STEP 1 / STEP 2 を実行済み
--   ・artist_role enum に 'vocalist' / 'producer' 追加済み
--   ・songs.anime_id が NULL 許容
--   ・songs.category 列あり
--   ・song_artists テーブルあり
--
-- 投入元: vocadb_clean.csv（157,329 行）
--   列: title, vocalist, producers(;区切り), publish_date(YYYY-MM-DD or 空)
--
-- 再実行安全（NOT EXISTS / ON CONFLICT でガード）
-- =========================================================


-- ---------------------------------------------------------
-- STEP A: staging テーブル作成（すべて text で受ける）
-- ---------------------------------------------------------
drop table if exists public.staging_vocaloid;

create table public.staging_vocaloid (
  title        text,
  vocalist     text,
  producers    text,
  publish_date text
);

-- ---------------------------------------------------------
-- STEP B: ここで vocadb_clean.csv を staging_vocaloid に取り込む
--   方法1) ローカルから psql:
--     \copy public.staging_vocaloid (title,vocalist,producers,publish_date) \
--       FROM 'vocadb_clean.csv' WITH (FORMAT csv, HEADER true)
--   方法2) Supabase ダッシュボード → Table Editor → staging_vocaloid →
--          Import data from CSV
-- ---------------------------------------------------------


-- ---------------------------------------------------------
-- STEP C: 正規化して本テーブルへ投入（B 完了後に実行）
-- ---------------------------------------------------------

-- C-1. ボーカルを artists に登録（role = 'vocalist'）
insert into public.artists (name, role)
select distinct trim(s.vocalist), 'vocalist'::artist_role
from public.staging_vocaloid s
where trim(coalesce(s.vocalist, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(s.vocalist) and a.role = 'vocalist'
  );

-- C-2. プロデューサーを artists に登録（; で分割、role = 'producer'）
insert into public.artists (name, role)
select distinct trim(p.name), 'producer'::artist_role
from public.staging_vocaloid s
cross join lateral unnest(string_to_array(s.producers, ';')) as p(name)
where trim(coalesce(p.name, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(p.name) and a.role = 'producer'
  );

-- C-3. 曲を songs に登録（title + publish_date でユニーク化）
insert into public.songs (song_title, song_type, category, release_date, anime_id)
select distinct
  s.title,
  'ボカロ曲'::song_type_enum,
  'vocaloid',
  nullif(s.publish_date, '')::date,
  null::integer
from public.staging_vocaloid s
where not exists (
  select 1 from public.songs g
  where g.song_title = s.title
    and g.category   = 'vocaloid'
    and g.release_date is not distinct from nullif(s.publish_date, '')::date
);

-- C-4. song_artists: ボーカルを紐付け
insert into public.song_artists (song_id, artist_id, role)
select distinct g.id, a.id, 'vocalist'::artist_role
from public.staging_vocaloid s
join public.songs g
  on g.song_title  = s.title
 and g.category    = 'vocaloid'
 and g.release_date is not distinct from nullif(s.publish_date, '')::date
join public.artists a
  on a.name = trim(s.vocalist) and a.role = 'vocalist'
where trim(coalesce(s.vocalist, '')) <> ''
on conflict (song_id, artist_id, role) do nothing;

-- C-5. song_artists: プロデューサーを紐付け（; で分割）
insert into public.song_artists (song_id, artist_id, role)
select distinct g.id, a.id, 'producer'::artist_role
from public.staging_vocaloid s
cross join lateral unnest(string_to_array(s.producers, ';')) as p(name)
join public.songs g
  on g.song_title  = s.title
 and g.category    = 'vocaloid'
 and g.release_date is not distinct from nullif(s.publish_date, '')::date
join public.artists a
  on a.name = trim(p.name) and a.role = 'producer'
where trim(coalesce(p.name, '')) <> ''
on conflict (song_id, artist_id, role) do nothing;


-- ---------------------------------------------------------
-- STEP D: 確認（任意）
-- ---------------------------------------------------------
-- select count(*) from public.songs        where category = 'vocaloid';
-- select count(*) from public.artists      where role in ('vocalist','producer');
-- select count(*) from public.song_artists;

-- ---------------------------------------------------------
-- STEP E: staging 後片付け（確認できたら）
-- ---------------------------------------------------------
-- drop table public.staging_vocaloid;
