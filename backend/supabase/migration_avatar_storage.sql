-- =========================================================
-- ユーザーアバター画像アップロード用 Storage バケット
--   - public バケット（表示は誰でも可、書き込みは本人のフォルダのみ）
--   - パス規約: avatars/{user_id}/icon.jpg（本人ごとに固定パス、upsertで上書き）
-- =========================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 読み取り：publicバケットなので誰でも閲覧可（明示的にもポリシーを設定）
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- アップロード：本人のフォルダ（先頭パスセグメント = auth.uid()）のみ許可
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 上書き（upsert）：本人のフォルダのみ許可
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 削除：本人のフォルダのみ許可
create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
