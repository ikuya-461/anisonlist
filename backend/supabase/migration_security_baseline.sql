-- =========================================================
-- 権限・ポリシー・制約のベースライン（本番 DB の状態をそのまま書き出したもの）
--
-- 背景:
--   2026-06-27 のセキュリティ修正や、Supabase ダッシュボードで作ったポリシーが
--   本番 DB にしか無く、リポジトリの SQL だけで構築すると
--     - 全件公開の users_select_all で非公開ユーザーのプロフィールが読める
--     - キャッシュ更新ポリシー + テーブル単位 UPDATE で曲名など全列を書き換えられる
--     - 未ログインでの画像キャッシュ書き込みが失敗する（anon 用ポリシーが無い）
--   状態になっていた。
--
-- 使い方:
--   既存のマイグレーションをすべて流した**最後**に適用する。
--     psql -1 -f backend/supabase/migration_security_baseline.sql
--   対象テーブルのポリシーを一度すべて削除して本番と同じ一式を作り直すため、
--   適用前の状態に関係なく同じ結果になる（本番に流しても変化なし。2026-10-17 検証）。
--
-- 含まないもの:
--   - テーブル定義・インデックス・関数本体（各マイグレーションを参照）
--   - Storage（avatars）のポリシー：migration_avatar_storage.sql と本番で一致
--   - Supabase 既定のテーブル権限（INSERT / DELETE 等。RLS で制御）
--
-- 注意（本番の現状をそのまま写しているもの。整理は別途）:
--   - lists / users / list_songs には同じ意味のポリシーが重複している
--     （ダッシュボード作成分と SQL 作成分）。PERMISSIVE なので OR で効き、結果は同じ
--   - 「認証ユーザーはyoutube_idを更新可」は全列に効く書き方だが、
--     列単位 GRANT で youtube_id・画像・英題以外は更新できない
--
-- 2026-10-17 作成（本番のカタログから生成）
-- =========================================================

-- 1. RLS の有効化
alter table public.songs enable row level security;
alter table public.anime enable row level security;
alter table public.artists enable row level security;
alter table public.games enable row level security;
alter table public.song_artists enable row level security;
alter table public.users enable row level security;
alter table public.lists enable row level security;
alter table public.list_songs enable row level security;
alter table public.list_anime enable row level security;
alter table public.list_likes enable row level security;

-- 2. ポリシー：対象テーブルの既存ポリシーをすべて削除し、本番と同じ一式を作る
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('songs', 'anime', 'artists', 'games', 'song_artists', 'users', 'lists', 'list_songs', 'list_anime', 'list_likes')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy anime_anon_update_image_cache on public.anime for update to anon
  using (true)
  with check (true);
create policy anime_select_all on public.anime for select to public
  using (true);
create policy anime_update_image_cache on public.anime for update to authenticated
  using (true)
  with check (true);
create policy artists_anon_update_image_cache on public.artists for update to anon
  using (true)
  with check (true);
create policy artists_select_all on public.artists for select to public
  using (true);
create policy artists_update_image_cache on public.artists for update to authenticated
  using (true)
  with check (true);
create policy games_anon_update_image_cache on public.games for update to anon
  using (true)
  with check (true);
create policy games_select_all on public.games for select to public
  using (true);
create policy games_update_image_cache on public.games for update to authenticated
  using (true)
  with check (true);
create policy list_anime_delete_own on public.list_anime for delete to public
  using ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_anime.list_id) AND (l.user_id = auth.uid())))));
create policy list_anime_insert_own on public.list_anime for insert to public
  with check ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_anime.list_id) AND (l.user_id = auth.uid())))));
create policy list_anime_select_public_or_own on public.list_anime for select to public
  using ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_anime.list_id) AND ((l.is_public = true) OR (l.user_id = auth.uid()))))));
create policy list_anime_update_own on public.list_anime for update to public
  using ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_anime.list_id) AND (l.user_id = auth.uid())))));
create policy "本人のみいいね削除" on public.list_likes for delete to public
  using ((auth.uid() = user_id));
create policy "本人のみいいね追加" on public.list_likes for insert to public
  with check ((auth.uid() = user_id));
create policy "誰でも閲覧可" on public.list_likes for select to public
  using (true);
create policy list_songs_delete_own on public.list_songs for delete to public
  using ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_songs.list_id) AND (l.user_id = auth.uid())))));
create policy list_songs_insert_own on public.list_songs for insert to public
  with check ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_songs.list_id) AND (l.user_id = auth.uid())))));
create policy list_songs_select_own on public.list_songs for select to public
  using ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_songs.list_id) AND (l.user_id = auth.uid())))));
create policy list_songs_update_own on public.list_songs for update to public
  using ((EXISTS ( SELECT 1
   FROM lists l
  WHERE ((l.id = list_songs.list_id) AND (l.user_id = auth.uid())))));
create policy "親リストが公開または本人" on public.list_songs for select to public
  using ((EXISTS ( SELECT 1
   FROM lists
  WHERE ((lists.id = list_songs.list_id) AND ((lists.is_public = true) OR (lists.user_id = auth.uid()))))));
create policy "UserListDelete" on public.lists for delete to authenticated
  using ((auth.uid() = user_id));
create policy "UserListInsert" on public.lists for insert to authenticated
  with check ((auth.uid() = user_id));
create policy "UserListSelect" on public.lists for select to authenticated
  using ((auth.uid() = user_id));
create policy "UserListUpdate" on public.lists for update to authenticated
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));
create policy lists_delete_own on public.lists for delete to public
  using ((auth.uid() = user_id));
create policy lists_insert_own on public.lists for insert to public
  with check ((auth.uid() = user_id));
create policy lists_select_own on public.lists for select to public
  using ((auth.uid() = user_id));
create policy lists_update_own on public.lists for update to public
  using ((auth.uid() = user_id));
create policy "公開または本人のみ閲覧" on public.lists for select to public
  using (((is_public = true) OR (auth.uid() = user_id)));
create policy song_artists_select_all on public.song_artists for select to public
  using (true);
create policy songs_anon_update_image_cache on public.songs for update to anon
  using (true)
  with check (true);
create policy songs_select_all on public.songs for select to public
  using (true);
create policy songs_update_image_cache on public.songs for update to authenticated
  using (true)
  with check (true);
create policy "認証ユーザーはyoutube_idを更新可" on public.songs for update to public
  using ((auth.uid() IS NOT NULL))
  with check ((auth.uid() IS NOT NULL));
create policy "Allow insert for authenticated users" on public.users for insert to public
  with check ((auth.uid() = id));
create policy "Allow select own user" on public.users for select to public
  using ((auth.uid() = id));
create policy "Allow update own user" on public.users for update to public
  using ((auth.uid() = id))
  with check ((auth.uid() = id));
create policy users_insert_own on public.users for insert to public
  with check ((auth.uid() = id));
create policy users_update_own on public.users for update to public
  using ((auth.uid() = id));
create policy "公開または本人のみ閲覧" on public.users for select to public
  using (((is_public = true) OR (auth.uid() = id)));

-- 3. 列単位の権限
--    テーブル単位の権限は全列に及び、列単位の REVOKE では打ち消せない。
--    テーブル単位を外してから（対応する列単位の権限も同時に外れる）必要な列だけ付け直す

-- 3-1. 画像・英語表記キャッシュ（+ ログインユーザーは youtube_id）だけ更新可
revoke update on public.songs, public.anime, public.artists, public.games from anon, authenticated;
grant update (image_url, title_en)               on public.songs   to anon;
grant update (image_url, title_en, youtube_id)   on public.songs   to authenticated;
grant update (image_url, title_en, title_romaji) on public.anime   to anon, authenticated;
grant update (image_url, name_en)                on public.artists to anon, authenticated;
grant update (image_url, title_en)               on public.games   to anon, authenticated;

-- 3-2. users は公開してよい列だけ読める（生年・性別は読めない）
revoke select on public.users from anon, authenticated;
grant select (id, user_name, created_at, bio, icon_url, is_public) on public.users to anon, authenticated;

-- 4. image_url は許可した CDN ドメインのみ（無い場合だけ追加）
do $$
declare t text;
begin
  foreach t in array array['songs', 'anime', 'artists', 'games'] loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', t)::regclass and conname = t || '_image_url_domain_chk'
    ) then
      execute format(
        'alter table public.%I add constraint %I check ((image_url IS NULL) OR (image_url ~ ''^https://([a-z0-9-]+\.)*(mzstatic\.com|myanimelist\.net|anilist\.co|rawg\.io)(/|$)''::text))',
        t, t || '_image_url_domain_chk');
    end if;
  end loop;
end $$;
