-- =========================================================
-- search_songs RPC をゲーム対応に更新
--   作品名(anime_title枠)に anime.title_jp と games.title_jp の
--   どちらかを表示（ゲーム曲は game_id 経由でゲーム名を出す）
--   ※ signature 不変のため create or replace のみ
-- =========================================================

create or replace function public.search_songs(
  p_keyword  text default '',
  p_artist   text default '',
  p_anime    text default '',
  p_type     text default '',
  p_category text default '',
  p_year     int  default 0,
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
    left join public.anime an on an.id = s.anime_id
    where (p_keyword  = '' or s.song_title ilike '%' || p_keyword || '%')
      and (p_category = '' or s.category = p_category)
      and (p_type     = '' or s.song_type::text = p_type)
      and (p_anime    = '' or exists (
            select 1 from public.anime a2
            where a2.id = s.anime_id and a2.title_jp ilike '%' || p_anime || '%'))
      and (p_artist   = '' or s.id in (select id from artist_songs))
      and (p_year     = 0  or
           coalesce(extract(year from s.release_date)::int, an.release_year) = p_year)
  ),
  counted as (select count(*) c from base)
  select
    b.id,
    b.song_title,
    b.song_type,
    b.category,
    b.image_url,
    (select a.name from public.artists a where a.id = b.artist_id)       as artist_name,
    coalesce(
      (select an.title_jp from public.anime an where an.id = b.anime_id),
      (select g.title_jp  from public.games g where g.id = b.game_id)
    )                                                                    as anime_title,
    (select string_agg(a.name, ', ' order by a.name)
       from public.song_artists sa join public.artists a on a.id = sa.artist_id
      where sa.song_id = b.id and sa.role = 'vocalist')                  as vocalists,
    (select string_agg(a.name, ', ' order by a.name)
       from public.song_artists sa join public.artists a on a.id = sa.artist_id
      where sa.song_id = b.id and sa.role = 'producer')                  as producers,
    (select c from counted)                                             as total_count
  from base b
  order by b.id asc
  limit p_limit offset p_offset;
$$;
