-- =========================================================
-- アカウント削除RPC（ストア審査要件: Apple 5.1.1(v)）
--   - 本人（auth.uid()）のみ実行可能
--   - 削除順序:
--       1. list_likes（自分が押したいいね）
--       2. lists（CASCADEで list_songs / list_likes(list_id) も削除）
--       3. auth.users（CASCADEで public.users も削除）
--   - SECURITY DEFINER: auth.users への削除権限を関数所有者(postgres)で実行
-- =========================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.list_likes where user_id = uid;
  delete from public.lists where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- 認証済みユーザーのみ実行可
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
