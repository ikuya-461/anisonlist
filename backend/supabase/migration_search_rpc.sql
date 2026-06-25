-- =========================================================
-- 曲検索の高速化＋アーティスト横断検索（RPC）
--
-- 目的:
--  A. 歌手名検索を artist_id（アニソン/VTuber）と song_artists
--     （ボカロのボーカル/プロデューサー）の両方にヒットさせる
--  B. 19.5万曲に対する曲名 ILIKE を pg_trgm GIN で高速化
-- =========================================================

-- B: pg_trgm 拡張 & インデックス
create extension if not exists pg_trgm;

create index if not exists idx_songs_title_trgm
  on public.songs using gin (song_title gin_trgm_ops);

create index if not exists idx_artists_name_trgm
  on public.artists using gin (name gin_trgm_ops);

-- アーティスト横断検索・カテゴリ browse 用
create index if not exists idx_songs_artist_id   on public.songs (artist_id);
create index if not exists idx_songs_category_id  on public.songs (category, id);

-- A+B: 検索 RPC
create or replace function public.search_songs(
  p_keyword  text default '',
  p_artist   text default '',
  p_anime    text default '',
  p_type     text default '',
  p_category text default '',
  p_limit    int  default 10,
  p_offset   int  default 0
)
returns table (
  id          int,
  song_title  text,
  song_type   public.song_type_enum,
  category    text,
  image_url   text,
  artist_name text,
  anime_title text,
  vocalists   text,
  producers   text,
  total_count bigint
)
language sql
stable
as $$
  with artist_songs as (
    -- 歌手名にマッチする曲id（artist_id 経由 ∪ song_artists 経由）
    select s.id
    from public.songs s
    join public.artists a on a.id = s.artist_id
    where p_artist <> '' and a.name ilike '%' || p_artist || '%'
    union
    select sa.song_id
    from public.song_artists sa
    join public.artists a on a.id = sa.artist_id
    where p_artist <> '' and a.name ilike '%' || p_artist || '%'
  ),
  base as (
    select s.*
    from public.songs s
    where (p_keyword  = '' or s.song_title ilike '%' || p_keyword || '%')
      and (p_category = '' or s.category = p_category)
      and (p_type     = '' or s.song_type::text = p_type)
      and (p_anime    = '' or exists (
            select 1 from public.anime an
            where an.id = s.anime_id and an.title_jp ilike '%' || p_anime || '%'))
      and (p_artist   = '' or s.id in (select id from artist_songs))
  ),
  counted as (select count(*) c from base)
  select
    b.id,
    b.song_title,
    b.song_type,
    b.category,
    b.image_url,
    (select a.name from public.artists a where a.id = b.artist_id)       as artist_name,
    (select an.title_jp from public.anime an where an.id = b.anime_id)   as anime_title,
    (select string_agg(a.name, ', ' order by a.name)
       from public.song_artists sa join public.artists a on a.id = sa.artist_id
      where sa.song_id = b.id and sa.role = 'vocalist')                  as vocalists,
    (select string_agg(a.name, ', ' order by a.name)
       from public.song_artists sa join public.artists a on a.id = sa.artist_id
      where sa.song_id = b.id and sa.role = 'producer')                  as producers,
    (select c from counted)                                             as total_count
  from base b
  order by b.id
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_songs(text, text, text, text, text, int, int)
  to anon, authenticated;
