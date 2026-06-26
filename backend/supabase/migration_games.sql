-- =========================================================
-- ゲーム音楽対応: games テーブル新設 + songs.game_id
--   ・anime とは別テーブルで作品（ゲーム）を管理
--   ・ゲーム曲は songs.category='game' / game_id→games / anime_id=null
-- =========================================================

create table if not exists public.games (
  id          integer generated always as identity primary key,
  title_jp    text not null,
  release_year smallint,
  image_url   text,
  created_at  timestamptz default now()
);

alter table public.games enable row level security;

drop policy if exists "games_select_all" on public.games;
create policy "games_select_all" on public.games for select using (true);

drop policy if exists "games_update_image_cache" on public.games;
create policy "games_update_image_cache" on public.games
  for update to authenticated using (true) with check (true);

create index if not exists idx_games_title on public.games (title_jp);

alter table public.songs add column if not exists game_id integer references public.games(id);
create index if not exists idx_songs_game_id on public.songs (game_id);
