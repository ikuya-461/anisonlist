-- =========================================================
-- 曲検索: 真の曖昧検索（誤字許容）+ 関連度順ソートに対応
--
-- 背景:
--   従来はキーワード一致が ILIKE '%x%'（部分一致）のみで、
--   1) 1文字でも違うとヒットしない（誤字に弱い）
--   2) 結果の並び順が関連度ではなく id 順（一番近い候補が上に来ない）
--   という2つの弱点があった。
--
-- 対応:
--   A. pg_trgm の `%` 演算子（類似度しきい値マッチ、GINインデックス使用）を
--      ILIKE に OR で追加し、誤字・表記ゆれのある曲名も拾えるようにする。
--   B. 前方一致 > 部分一致 > 類似度スコア の順にスコアを付け、
--      関連度が高い候補から並ぶようにする。
--
-- 性能上の注意（検証済み）:
--   - `similarity()` を生の述語（similarity(col, kw) > 0.3）としてWHEREに
--     書くとtrgm GINインデックスが使われずSeq Scanになり231k行で1秒以上
--     かかる。必ず `%` 演算子（インデックス利用）で書くこと。
--   - 関数定義に `SET pg_trgm.similarity_threshold = ...` を付けると
--     SQL関数のインライン化が無効になり同様に大幅に遅くなる（1.1秒→12ms
--     で実測確認）。pg_trgmの既定しきい値は元々0.3のため、SET句無しで
--     意図通りの挙動になる。
--   - 「ラブ」のような2文字の頻出部分文字列は、`%`演算子を足すとプランナが
--     Seq Scanを選び935msまで悪化する（ILIKE単独でも元々180ms程度と遅めだが
--     `%`追加でさらに悪化する）。char_length(p_keyword) >= 3 のガードで
--     短いキーワードは従来通りILIKEのみに留め、この劣化を防ぐ
--     （3文字以上は数msで高速）。
--
-- 2026-10-17 修正:
--   初版（2026-07-21）で作品名の式から games の coalesce が抜け、
--   ゲーム曲の作品名が空で返っていた。migration_search_games.sql と
--   同じく「アニメ名、無ければゲーム名」に戻した。
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
    select s.*,
      case
        when p_keyword = '' then 0.0
        when s.song_title ilike p_keyword || '%' then 3.0       -- 前方一致
        when s.song_title ilike '%' || p_keyword || '%' then 2.0 -- 部分一致
        else similarity(s.song_title, p_keyword)                 -- 曖昧一致(0〜1)
      end as rank_score
    from public.songs s
    left join public.anime an on an.id = s.anime_id
    where (p_category = '' or s.category = p_category)
      and (p_type     = '' or s.song_type::text = p_type)
      and (p_anime    = '' or exists (
            select 1 from public.anime a2
            where a2.id = s.anime_id and a2.title_jp ilike '%' || p_anime || '%'))
      and (p_artist   = '' or s.id in (select id from artist_songs))
      and (p_year     = 0  or
           coalesce(extract(year from s.release_date)::int, an.release_year) = p_year)
      and (
        p_keyword = ''
        or s.song_title ilike '%' || p_keyword || '%'
        or (char_length(p_keyword) >= 3 and s.song_title % p_keyword)
      )
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
  order by b.rank_score desc, b.id
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_songs(text, text, text, text, text, int, int, int)
  to anon, authenticated;
