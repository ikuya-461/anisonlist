-- =========================================================
-- VTuber 曲 一括投入（staging テーブル方式）
--
-- 前提:
--   ・song_type_enum に 'オリジナル曲' を追加済み
--   ・songs.category（text）/ release_date 列あり、anime_id NULL 許容
--
-- 投入元: vtuber_match_clean.csv（agency_check='一致' を dedup した 1,623 行）
--   列: title, artist, release_date(YYYY-MM-DD or 空)
--
-- VTuber は曲ごとに単一アーティストのため songs.artist_id に直接ひも付ける
-- （ボカロのような多対多 song_artists は使わない）
--
-- 一律付与: category='Vtuber', song_type='オリジナル曲'
-- 再実行安全（NOT EXISTS でガード）
-- =========================================================

-- STEP A: staging
drop table if exists public.staging_vtuber;
create table public.staging_vtuber (
  title        text,
  artist       text,
  release_date text
);

-- STEP B: ここで vtuber_match_clean.csv を \copy で取り込む
--   \copy public.staging_vtuber (title,artist,release_date) FROM 'vtuber_match_clean.csv' WITH (FORMAT csv, HEADER true)

-- STEP C-1: アーティストを artists に登録（role='artist'、既存は再利用）
insert into public.artists (name, role)
select distinct trim(s.artist), 'artist'::artist_role
from public.staging_vtuber s
where trim(coalesce(s.artist, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(s.artist) and a.role = 'artist'
  );

-- STEP C-2: 曲を songs に登録（title + artist + release_date でユニーク化）
insert into public.songs (song_title, song_type, category, release_date, anime_id, artist_id)
select distinct
  s.title,
  'オリジナル曲'::song_type_enum,
  'Vtuber',
  nullif(s.release_date, '')::date,
  null::integer,
  (select min(a.id) from public.artists a where a.name = trim(s.artist) and a.role = 'artist')
from public.staging_vtuber s
where not exists (
  select 1 from public.songs g
  where g.song_title = s.title
    and g.category   = 'Vtuber'
    and g.artist_id is not distinct from
        (select min(a.id) from public.artists a where a.name = trim(s.artist) and a.role = 'artist')
    and g.release_date is not distinct from nullif(s.release_date, '')::date
);

-- STEP D: 確認
-- select count(*) from public.songs where category='Vtuber';

-- STEP E: 後片付け
-- drop table public.staging_vtuber;
