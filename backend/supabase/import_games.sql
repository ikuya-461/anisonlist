-- =========================================================
-- ゲーム音楽 一括投入（staging 方式 / 既存 anime-song モデル準拠）
--   投入元: game_clean.csv（30,660行）
--   列: title, release_date, type_raw, song_type, song_title,
--       singer, lyricist, composer, arranger
--   一律: category='game'、作品は games テーブル、song_info=type_raw（版・機種情報を保持）
--   再実行安全（NOT EXISTS ガード）
-- =========================================================

set statement_timeout = 0;

-- STEP A: staging
drop table if exists public.staging_game;
create table public.staging_game (
  title text, release_date text, type_raw text, song_type text,
  song_title text, singer text, lyricist text, composer text, arranger text
);

-- STEP B: CSV 取り込み
\copy public.staging_game (title,release_date,type_raw,song_type,song_title,singer,lyricist,composer,arranger) FROM '/Users/shiroiikuya/Downloads/game_clean.csv' WITH (FORMAT csv, HEADER true)

-- STEP C-1: games（作品）登録。release_year はその作品の最古の年
insert into public.games (title_jp, release_year)
select s.title, min(extract(year from nullif(s.release_date,'')::date))::smallint
from public.staging_game s
where trim(coalesce(s.title,'')) <> ''
  and not exists (select 1 from public.games g where g.title_jp = s.title)
group by s.title;

-- STEP C-2: artists（4ロール）登録
insert into public.artists (name, role)
select distinct trim(s.singer), 'artist'::artist_role from public.staging_game s
where trim(coalesce(s.singer,'')) <> ''
  and not exists (select 1 from public.artists a where a.name=trim(s.singer) and a.role='artist');

insert into public.artists (name, role)
select distinct trim(s.lyricist), 'lyricist'::artist_role from public.staging_game s
where trim(coalesce(s.lyricist,'')) <> ''
  and not exists (select 1 from public.artists a where a.name=trim(s.lyricist) and a.role='lyricist');

insert into public.artists (name, role)
select distinct trim(s.composer), 'composer'::artist_role from public.staging_game s
where trim(coalesce(s.composer,'')) <> ''
  and not exists (select 1 from public.artists a where a.name=trim(s.composer) and a.role='composer');

insert into public.artists (name, role)
select distinct trim(s.arranger), 'arranger'::artist_role from public.staging_game s
where trim(coalesce(s.arranger,'')) <> ''
  and not exists (select 1 from public.artists a where a.name=trim(s.arranger) and a.role='arranger');

-- STEP C-3: songs 登録
insert into public.songs (song_title, song_type, song_info, category, release_date, anime_id, game_id,
                          artist_id, lyricist_id, composer_id, arranger_id)
select
  s.song_title,
  s.song_type::song_type_enum,
  nullif(s.type_raw,''),
  'game',
  nullif(s.release_date,'')::date,
  null::integer,
  (select min(g.id) from public.games g where g.title_jp = s.title),
  (select min(a.id) from public.artists a where a.name=trim(s.singer)   and a.role='artist'),
  (select min(a.id) from public.artists a where a.name=trim(s.lyricist) and a.role='lyricist'),
  (select min(a.id) from public.artists a where a.name=trim(s.composer) and a.role='composer'),
  (select min(a.id) from public.artists a where a.name=trim(s.arranger) and a.role='arranger')
from public.staging_game s
where not exists (
  select 1 from public.songs x
  where x.category='game'
    and x.song_title = s.song_title
    and x.game_id is not distinct from (select min(g.id) from public.games g where g.title_jp = s.title)
    and x.release_date is not distinct from nullif(s.release_date,'')::date
    and x.song_info is not distinct from nullif(s.type_raw,'')
);

-- STEP D: 後片付け
drop table if exists public.staging_game;
