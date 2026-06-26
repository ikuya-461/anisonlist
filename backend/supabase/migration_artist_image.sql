-- =========================================================
-- アーティスト画像キャッシュ対応
--  ・artists.image_url 列を追加
--  ・認証ユーザーが画像をキャッシュ(UPDATE)できるRLSポリシーを追加
--    （songs.songs_update_image_cache と同じ方針）
-- =========================================================

alter table public.artists add column if not exists image_url text;

drop policy if exists "artists_update_image_cache" on public.artists;
create policy "artists_update_image_cache"
  on public.artists
  for update
  to authenticated
  using (true)
  with check (true);
