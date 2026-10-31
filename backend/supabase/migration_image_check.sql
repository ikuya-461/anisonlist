-- =========================================================
-- 曲画像の一括登録（PRD: docs/prd/2026-10-30-image-accuracy.md の M6）のための列
--
-- image_checked_at : 一括登録が最後に iTunes を探した日時。見つからなかった曲も記録し、
--                    再開時に同じ曲を探し直さないようにする（アプリ側で使うのは F8 で別途）
-- image_source     : image_url を書いたのが誰か。null はアプリ（表示時のキャッシュ）か、この列より前
--                    'batch'   … 一括登録が画像の無かった曲に付けた
--                    'recheck' … 再検査（M5）でオーナーの GO を受けて差し替えた
--                    一括登録の結果を取り消すときは image_source = 'batch' の行だけを戻せる
--
-- 権限：anon / authenticated は songs のテーブル単位の UPDATE を外し、列単位で
--       image_url・title_en（・youtube_id）だけを許可している（migration_security_baseline.sql）。
--       新しい列には何も許可しないので、書けるのは一括登録（DB 接続の所有者）だけになる。
--       SELECT はテーブル単位で許可済みのため、アプリからは読める
-- =========================================================

alter table public.songs
  add column if not exists image_checked_at timestamptz,
  add column if not exists image_source text;

alter table public.songs
  drop constraint if exists songs_image_source_check;
alter table public.songs
  add constraint songs_image_source_check
  check (image_source is null or image_source in ('batch', 'recheck'));

comment on column public.songs.image_checked_at is '一括登録が最後に iTunes を探した日時（見つからなかった場合も記録）';
comment on column public.songs.image_source is 'image_url を書いた処理（null=アプリまたは列追加前 / batch=一括登録 / recheck=再検査で差し替え）';

-- ---------------------------------------------------------
-- 適用後の確認（読み取りのみ）
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'songs'
--      and column_name in ('image_checked_at', 'image_source');
--   -- anon / authenticated が新しい列を更新できないこと（どちらも false になる）
--   select has_column_privilege('anon', 'public.songs', 'image_checked_at', 'UPDATE'),
--          has_column_privilege('authenticated', 'public.songs', 'image_source', 'UPDATE');
--
-- 取り消し（一括登録の結果ごと戻すとき）
--   update public.songs set image_url = null, image_source = null where image_source = 'batch';
--   alter table public.songs drop constraint if exists songs_image_source_check;
--   alter table public.songs drop column if exists image_checked_at, drop column if exists image_source;
-- ---------------------------------------------------------
