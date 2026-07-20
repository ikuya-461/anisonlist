-- =========================================================
-- アニメ・アーティスト検索を RPC 化し、曲検索と同じ
-- 「真の曖昧検索(誤字許容) + 関連度順ソート」に対応させる
--
-- 背景: 従来は Supabase query builder の .ilike()/.or() のみで、
--   1) 誤字・表記ゆれに弱い（部分一致のみ）
--   2) 関連度順ではなく id/release_year 等の機械的な順序
--   だった（migration_search_fuzzy.sql で曲検索にのみ対応済みだった）
--
-- 設計は search_songs と同一の方針（詳細はそちらのコメント参照）:
--   - `%` 演算子（trgm GINインデックス使用）をILIKEにOR追加
--   - 前方一致 > 部分一致 > 類似度スコア の順にランク付け
--   - SET pg_trgm.similarity_threshold は付けない（関数インライン化が
--     無効になり大幅に遅くなるため。既定値0.3で意図通り動作）
--   - 3文字未満のキーワードは曖昧検索を無効化（短い頻出文字列で
--     プランナがSeq Scanを選ぶ劣化を防ぐ）
--
-- anime.title_jp / title_en には trgm インデックスが無かったため新規作成。
-- artists.name の trgm インデックスは既存(idx_artists_name_trgm)を流用。
-- =========================================================

create index if not exists idx_anime_title_jp_trgm on public.anime using gin (title_jp gin_trgm_ops);
create index if not exists idx_anime_title_en_trgm on public.anime using gin (title_en gin_trgm_ops);

create or replace function public.search_anime(
  p_keyword text default '',
  p_year    int  default 0,
  p_season  text default '',
  p_limit   int  default 10,
  p_offset  int  default 0
)
returns table (
  id             int,
  title_jp       text,
  title_en       text,
  title_romaji   text,
  release_year   int,
  release_season text,
  type           public.anime_type,
  image_url      text,
  created_at     timestamptz,
  total_count    bigint
)
language sql
stable
as $$
  with base as (
    select a.*,
      case
        when p_keyword = '' then 0.0
        when a.title_jp ilike p_keyword || '%' or a.title_en ilike p_keyword || '%' then 3.0
        when a.title_jp ilike '%' || p_keyword || '%' or a.title_en ilike '%' || p_keyword || '%' then 2.0
        else greatest(
          similarity(a.title_jp, p_keyword),
          similarity(coalesce(a.title_en, ''), p_keyword)
        )
      end as rank_score
    from public.anime a
    where (p_year   = 0  or a.release_year = p_year)
      and (p_season = '' or a.release_season = p_season)
      and (
        p_keyword = ''
        or a.title_jp ilike '%' || p_keyword || '%'
        or a.title_en ilike '%' || p_keyword || '%'
        or (char_length(p_keyword) >= 3 and (a.title_jp % p_keyword or a.title_en % p_keyword))
      )
  ),
  counted as (select count(*) c from base)
  select
    b.id, b.title_jp, b.title_en, b.title_romaji, b.release_year, b.release_season,
    b.type, b.image_url, b.created_at,
    (select c from counted) as total_count
  from base b
  order by b.rank_score desc, b.release_year desc nulls last, b.title_jp asc
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_anime(text, int, text, int, int) to anon, authenticated;

create or replace function public.search_artists(
  p_keyword text default '',
  p_limit   int  default 10,
  p_offset  int  default 0
)
returns table (
  id         int,
  name       text,
  name_en    text,
  role       public.artist_role,
  image_url  text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
as $$
  with base as (
    select a.*,
      case
        when p_keyword = '' then 0.0
        when a.name ilike p_keyword || '%' then 3.0
        when a.name ilike '%' || p_keyword || '%' then 2.0
        else similarity(a.name, p_keyword)
      end as rank_score
    from public.artists a
    where (
      p_keyword = ''
      or a.name ilike '%' || p_keyword || '%'
      or (char_length(p_keyword) >= 3 and a.name % p_keyword)
    )
  ),
  counted as (select count(*) c from base)
  select b.id, b.name, b.name_en, b.role, b.image_url, b.created_at,
    (select c from counted) as total_count
  from base b
  order by b.rank_score desc, b.id asc
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_artists(text, int, int) to anon, authenticated;
