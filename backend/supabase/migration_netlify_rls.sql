-- =========================================================
-- Netlifyデプロイ移行用 RLSポリシー & RPC関数
-- Supabase ダッシュボード → SQL Editor で実行してください
-- =========================================================

-- ---------------------------------------------------------
-- 0. 外部キー制約の追加
--    既存DBはアプリ側JOINのみでFK制約が無いため、
--    PostgRESTのネスト select（リレーション埋め込み）が機能しない。
--    NOT VALID で追加することで、既存の不整合データがあっても
--    制約追加自体は失敗しない（PostgRESTのリレーション検出には
--    制約の存在のみ必要で、VALIDATEは必須ではない）。
-- ---------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'songs_artist_id_fkey') then
    alter table public.songs add constraint songs_artist_id_fkey foreign key (artist_id) references public.artists(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'songs_lyricist_id_fkey') then
    alter table public.songs add constraint songs_lyricist_id_fkey foreign key (lyricist_id) references public.artists(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'songs_composer_id_fkey') then
    alter table public.songs add constraint songs_composer_id_fkey foreign key (composer_id) references public.artists(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'songs_arranger_id_fkey') then
    alter table public.songs add constraint songs_arranger_id_fkey foreign key (arranger_id) references public.artists(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'songs_anime_id_fkey') then
    alter table public.songs add constraint songs_anime_id_fkey foreign key (anime_id) references public.anime(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'list_songs_list_id_fkey') then
    alter table public.list_songs add constraint list_songs_list_id_fkey foreign key (list_id) references public.lists(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'list_songs_song_id_fkey') then
    alter table public.list_songs add constraint list_songs_song_id_fkey foreign key (song_id) references public.songs(id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lists_user_id_fkey') then
    alter table public.lists add constraint lists_user_id_fkey foreign key (user_id) references public.users(id) not valid;
  end if;
end $$;

-- ---------------------------------------------------------
-- 1. lists: 本人の行のみ操作可能
-- ---------------------------------------------------------
alter table public.lists enable row level security;

create policy "lists_select_own" on public.lists
  for select using (auth.uid() = user_id);

create policy "lists_insert_own" on public.lists
  for insert with check (auth.uid() = user_id);

create policy "lists_update_own" on public.lists
  for update using (auth.uid() = user_id);

create policy "lists_delete_own" on public.lists
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 2. list_songs: 自分が所有する list_id に対してのみ操作可能
-- ---------------------------------------------------------
alter table public.list_songs enable row level security;

create policy "list_songs_select_own" on public.list_songs
  for select using (
    exists (
      select 1 from public.lists l
      where l.id = list_songs.list_id and l.user_id = auth.uid()
    )
  );

create policy "list_songs_insert_own" on public.list_songs
  for insert with check (
    exists (
      select 1 from public.lists l
      where l.id = list_songs.list_id and l.user_id = auth.uid()
    )
  );

create policy "list_songs_update_own" on public.list_songs
  for update using (
    exists (
      select 1 from public.lists l
      where l.id = list_songs.list_id and l.user_id = auth.uid()
    )
  );

create policy "list_songs_delete_own" on public.list_songs
  for delete using (
    exists (
      select 1 from public.lists l
      where l.id = list_songs.list_id and l.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- 3. users: 全員が閲覧可能、本人のみ更新・登録可能
-- ---------------------------------------------------------
alter table public.users enable row level security;

create policy "users_select_all" on public.users
  for select using (true);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ---------------------------------------------------------
-- 4. songs / anime / artists: 全員が閲覧可能
--    画像キャッシュ書き込み（image_url のみ）は誰でも更新可能にする
-- ---------------------------------------------------------
alter table public.songs enable row level security;
alter table public.anime enable row level security;
alter table public.artists enable row level security;

create policy "songs_select_all" on public.songs
  for select using (true);
create policy "anime_select_all" on public.anime
  for select using (true);
create policy "artists_select_all" on public.artists
  for select using (true);

-- 画像キャッシュ用更新ポリシー（authenticated ロールに限定して許可）
create policy "songs_update_image_cache" on public.songs
  for update
  to authenticated
  using (true)
  with check (true);

create policy "anime_update_image_cache" on public.anime
  for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------
-- 5. 並び替え用 RPC: reorder_list_songs
--    position の UNIQUE(list_id, position) 制約との衝突を避けるため
--    一旦負の仮位置に退避してから本来の位置へ更新する
--    （Express側で行っていた二段階トランザクションと同じロジック）
-- ---------------------------------------------------------
create or replace function public.reorder_list_songs(p_list_id bigint, p_orders jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  -- 呼び出し元が当該リストの所有者であることを確認
  if not exists (
    select 1 from public.lists
    where id = p_list_id and user_id = auth.uid()
  ) then
    raise exception 'Forbidden';
  end if;

  -- ① 一旦負の仮位置へ退避（UNIQUE制約衝突防止）
  for item in select * from jsonb_array_elements(p_orders)
  loop
    update public.list_songs
       set position = -((item->>'position')::int + 1)
     where id = (item->>'id')::bigint
       and list_id = p_list_id;
  end loop;

  -- ② 本来の position に更新
  for item in select * from jsonb_array_elements(p_orders)
  loop
    update public.list_songs
       set position = (item->>'position')::int
     where id = (item->>'id')::bigint
       and list_id = p_list_id;
  end loop;
end;
$$;

grant execute on function public.reorder_list_songs(bigint, jsonb) to authenticated;
