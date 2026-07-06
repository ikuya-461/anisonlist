-- =========================================================
-- アニメリスト機能
--   1. lists.list_type: 'song'（既存・デフォルト） / 'anime'
--   2. list_anime: list_songs と同型の中間テーブル
--      （memo + anime_tags。RLSも list_songs と同方針）
-- =========================================================

-- 1. リストタイプ（既存リストは全て 'song' になり完全互換）
alter table public.lists
  add column if not exists list_type text not null default 'song'
  check (list_type in ('song', 'anime'));

-- 2. アニメリストの中間テーブル
create table if not exists public.list_anime (
  id          serial primary key,
  list_id     integer not null references public.lists(id) on delete cascade,
  anime_id    integer not null references public.anime(id) on delete cascade,
  position    integer not null,
  memo        varchar(30),
  anime_tags  text[],
  created_at  timestamp without time zone default now(),
  unique (list_id, position),
  unique (list_id, anime_id)
);

alter table public.list_anime enable row level security;

-- 親リストが公開または本人なら閲覧可（公開ページ /public/:id 用）
create policy "list_anime_select_public_or_own" on public.list_anime
  for select using (
    exists (
      select 1 from public.lists l
      where l.id = list_anime.list_id
        and (l.is_public = true or l.user_id = auth.uid())
    )
  );

-- 追加・更新・削除は本人のみ
create policy "list_anime_insert_own" on public.list_anime
  for insert with check (
    exists (
      select 1 from public.lists l
      where l.id = list_anime.list_id and l.user_id = auth.uid()
    )
  );

create policy "list_anime_update_own" on public.list_anime
  for update using (
    exists (
      select 1 from public.lists l
      where l.id = list_anime.list_id and l.user_id = auth.uid()
    )
  );

create policy "list_anime_delete_own" on public.list_anime
  for delete using (
    exists (
      select 1 from public.lists l
      where l.id = list_anime.list_id and l.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.list_anime to authenticated;
grant select on public.list_anime to anon;
grant usage on sequence public.list_anime_id_seq to authenticated;

-- =========================================================
-- 並び替えRPC（reorder_list_songs と同型。UNIQUE制約回避の二段階更新）
-- =========================================================
create or replace function public.reorder_list_anime(p_list_id bigint, p_orders jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  item jsonb;
begin
  if not exists (
    select 1 from public.lists
    where id = p_list_id and user_id = auth.uid()
  ) then
    raise exception 'Forbidden';
  end if;

  for item in select * from jsonb_array_elements(p_orders)
  loop
    update public.list_anime
       set position = -((item->>'position')::int + 1)
     where id = (item->>'id')::bigint
       and list_id = p_list_id;
  end loop;

  for item in select * from jsonb_array_elements(p_orders)
  loop
    update public.list_anime
       set position = (item->>'position')::int
     where id = (item->>'id')::bigint
       and list_id = p_list_id;
  end loop;
end;
$function$;

revoke all on function public.reorder_list_anime(bigint, jsonb) from public, anon;
grant execute on function public.reorder_list_anime(bigint, jsonb) to authenticated;
