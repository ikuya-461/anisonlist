-- =========================================================
-- アニソン 2026年作品 一括投入（staging テーブル方式）
--
-- 投入元: anison_2026_import.csv（2,073 行）
--   列: title_jp, anime_type, release_year, release_season, air_start,
--       song_type, song_info, song_title, singer, lyricist, composer, arranger
--
-- 対象: アニメ系のみ（ゲーム・バラエティ・Webラジオ等はスキップ済み）
-- 一律: category='anime'
-- 再実行安全（NOT EXISTS ガード）
-- =========================================================

set statement_timeout = 0;

-- ---------------------------------------------------------
-- STEP A: staging テーブル
-- ---------------------------------------------------------
drop table if exists public.staging_anison_2026;
create table public.staging_anison_2026 (
  title_jp       text,
  anime_type     text,
  release_year   text,
  release_season text,
  air_start      text,
  song_type      text,
  song_info      text,
  song_title     text,
  singer         text,
  lyricist       text,
  composer       text,
  arranger       text
);

-- ---------------------------------------------------------
-- STEP B: CSV 取り込み（実行前にパスを修正してください）
--   \copy public.staging_anison_2026
--     FROM '/Users/shiroiikuya/作業ツール/anison_2026_import.csv'
--     WITH (FORMAT csv, HEADER true)
-- ---------------------------------------------------------


-- ---------------------------------------------------------
-- STEP C-1: anime テーブルに作品登録（既存はスキップ）
-- ---------------------------------------------------------
insert into public.anime (title_jp, type, release_year, release_season)
select distinct
  s.title_jp,
  s.anime_type::anime_type,
  nullif(s.release_year, '')::integer,
  nullif(s.release_season, '')
from public.staging_anison_2026 s
where trim(coalesce(s.title_jp, '')) <> ''
  and not exists (
    select 1 from public.anime a where a.title_jp = s.title_jp
  );

-- ---------------------------------------------------------
-- STEP C-2: artists テーブルに登録（4ロール、既存はスキップ）
-- ---------------------------------------------------------
-- 歌手 (role = 'artist')
insert into public.artists (name, role)
select distinct trim(s.singer), 'artist'::artist_role
from public.staging_anison_2026 s
where trim(coalesce(s.singer, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(s.singer) and a.role = 'artist'
  );

-- 作詞 (role = 'lyricist')
insert into public.artists (name, role)
select distinct trim(s.lyricist), 'lyricist'::artist_role
from public.staging_anison_2026 s
where trim(coalesce(s.lyricist, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(s.lyricist) and a.role = 'lyricist'
  );

-- 作曲 (role = 'composer')
insert into public.artists (name, role)
select distinct trim(s.composer), 'composer'::artist_role
from public.staging_anison_2026 s
where trim(coalesce(s.composer, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(s.composer) and a.role = 'composer'
  );

-- 編曲 (role = 'arranger')
insert into public.artists (name, role)
select distinct trim(s.arranger), 'arranger'::artist_role
from public.staging_anison_2026 s
where trim(coalesce(s.arranger, '')) <> ''
  and not exists (
    select 1 from public.artists a
    where a.name = trim(s.arranger) and a.role = 'arranger'
  );

-- ---------------------------------------------------------
-- STEP C-3: songs テーブルに登録
--   デュープ判定: song_title + anime_id + song_type + song_info
-- ---------------------------------------------------------
insert into public.songs (
  song_title, song_type, song_info, category,
  anime_id, game_id,
  artist_id, lyricist_id, composer_id, arranger_id
)
select
  s.song_title,
  s.song_type::song_type_enum,
  nullif(trim(s.song_info), ''),
  'anime',
  (select min(a.id) from public.anime a where a.title_jp = s.title_jp),
  null::integer,
  (select min(a.id) from public.artists a where a.name = trim(s.singer)   and a.role = 'artist'),
  (select min(a.id) from public.artists a where a.name = trim(s.lyricist) and a.role = 'lyricist'),
  (select min(a.id) from public.artists a where a.name = trim(s.composer) and a.role = 'composer'),
  (select min(a.id) from public.artists a where a.name = trim(s.arranger) and a.role = 'arranger')
from public.staging_anison_2026 s
where trim(coalesce(s.song_title, '')) <> ''
  and not exists (
    select 1 from public.songs x
    where x.category = 'anime'
      and x.song_title = s.song_title
      and x.anime_id is not distinct from
          (select min(a.id) from public.anime a where a.title_jp = s.title_jp)
      and x.song_type::text = s.song_type
      and x.song_info is not distinct from nullif(trim(s.song_info), '')
  );

-- ---------------------------------------------------------
-- STEP D: 確認
-- ---------------------------------------------------------
-- select count(*) from public.anime  where created_at > now() - interval '1 hour';
-- select count(*) from public.songs  where category='anime' and created_at > now() - interval '1 hour';
-- select count(*) from public.artists where created_at > now() - interval '1 hour';

-- ---------------------------------------------------------
-- STEP E: 後片付け
-- ---------------------------------------------------------
-- drop table public.staging_anison_2026;
