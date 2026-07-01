-- =========================================================
-- 英語タイトル / 名前キャッシュ列を追加
--   - image_url と同じ「APIから取得してDBにキャッシュする列」扱い
--   - anime.title_en は既存。ローマ字(title_romaji)を新設
--   - コンテンツ列(song_title/name 等)は書き換え不可のまま維持し、
--     新しい英語列のみ anon / authenticated に UPDATE を許可
--     （X投稿#20 の列レベルGRANTセキュリティ設計を踏襲）
-- =========================================================

alter table public.anime   add column if not exists title_romaji text;
alter table public.artists add column if not exists name_en      text;
alter table public.games   add column if not exists title_en     text;
alter table public.songs   add column if not exists title_en     text;

-- 英語列のみキャッシュ書き込みを許可（画像キャッシュと同方針）
grant update (title_en, title_romaji) on public.anime   to authenticated, anon;
grant update (name_en)                on public.artists to authenticated, anon;
grant update (title_en)               on public.games   to authenticated, anon;
grant update (title_en)               on public.songs   to authenticated, anon;
