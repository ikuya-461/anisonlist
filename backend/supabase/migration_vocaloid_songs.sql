-- =========================================================
-- ボカロ曲対応マイグレーション
--
-- 既存の songs / artists テーブル構造は維持しつつ:
--   ・artist_role enum に 'vocalist' / 'producer' を追加
--   ・anime_id を NULL 許容化（ボカロ曲はアニメに属さない）
--   ・category 列を追加（'anime' / 'vocaloid' で区別）
--   ・song_artists 中間テーブルを新設（複数ボーカル・複数プロデューサー対応）
--
-- ⚠️ PostgreSQL の制約により、enum へ追加した値は
--    同一トランザクション内で使用できない。
--    そのため STEP 1 を実行 → 完了後に STEP 2 を実行すること。
-- =========================================================


-- =========================================================
-- STEP 1: enum に値を追加（これだけ単独で先に実行する）
-- =========================================================
alter type public.artist_role add value if not exists 'vocalist';
alter type public.artist_role add value if not exists 'producer';

-- ボカロ曲用の song_type を追加（CSV元の songType は無視し、これを一律付与）
alter type public.song_type_enum add value if not exists 'ボカロ曲';


-- =========================================================
-- STEP 2: STEP 1 完了後に、ここから下をまとめて実行する
-- =========================================================

-- 2-1. anime_id を NULL 許容に変更
alter table public.songs
  alter column anime_id drop not null;

-- 2-2. category 列を追加（既存データは 'anime' として初期化）
alter table public.songs
  add column if not exists category text not null default 'anime';

-- 2-2b. release_date 列を追加（ボカロ曲の publish_date 置き場。既存アニメ曲は NULL）
alter table public.songs
  add column if not exists release_date date;

-- 2-3. song_artists 中間テーブル（複数人対応）
create table if not exists public.song_artists (
  id bigint generated always as identity primary key,
  song_id bigint not null references public.songs(id) on delete cascade,
  artist_id bigint not null references public.artists(id) on delete cascade,
  role public.artist_role not null, -- 'vocalist' / 'producer' / 'lyricist' / 'composer' / 'arranger' / 'artist'
  created_at timestamptz default now(),
  unique (song_id, artist_id, role)
);

alter table public.song_artists enable row level security;

create policy "song_artists_select_all"
  on public.song_artists
  for select
  using (true);

create index if not exists idx_song_artists_song_id  on public.song_artists(song_id);
create index if not exists idx_song_artists_artist_id on public.song_artists(artist_id);
