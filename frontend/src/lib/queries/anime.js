import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { fetchAnimeMeta } from "../imageCache/animeImageCache";
import { calcRange, calcTotalPages } from "../utils/pagination";

/* -------------------------------------------------------
   ① アニメ一覧（検索 + ページネーション）
------------------------------------------------------- */
export async function searchAnime({ keyword: rawKeyword = "", year = "", season = "", page = 1 } = {}) {
  const keyword = normalizeText(rawKeyword);

  const limit = calcRange(1).to + 1; // = PAGE_SIZE
  const { from } = calcRange(page);

  // 曖昧検索(誤字許容)+関連度順ソートはRPC側で実施（search_songsと同じ方式）
  const { data, error } = await supabase.rpc("search_anime", {
    p_keyword: keyword,
    p_year: year ? Number(year) : 0,
    p_season: season || "",
    p_limit: limit,
    p_offset: from,
  });

  if (error) {
    console.error("searchAnime error:", error);
    return { anime: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const count = data?.[0]?.total_count ?? 0;

  // 画像・英題の取得は呼び出し側でバックグラウンド実行させ、結果表示をブロックしない
  return {
    anime: data ?? [],
    total: count,
    page: Number(page),
    totalPages: calcTotalPages(count),
  };
}

/* -------------------------------------------------------
   ② アニメ画像取得（キャッシュ対応）
------------------------------------------------------- */
export async function getAnimeImage(title) {
  if (!title) return null;

  const { data: cached } = await supabase
    .from("anime")
    .select("image_url, title_en, title_romaji")
    .eq("title_jp", title)
    .limit(1)
    .maybeSingle();

  // 画像・英題・ローマ字がすべて揃っていればAPIを叩かない
  if (cached?.image_url && cached?.title_en && cached?.title_romaji) {
    return cached.image_url;
  }

  // AniList から画像＋英題/ローマ字をまとめて取得（Jikanは504頻発・日本語に弱いため）
  const meta = await fetchAnimeMeta(title);
  if (!meta) return cached?.image_url ?? null;

  const patch = {};
  if (!cached?.image_url && meta.cover)            patch.image_url    = meta.cover;
  if (!cached?.title_en && meta.title_en)          patch.title_en     = meta.title_en;
  if (!cached?.title_romaji && meta.title_romaji)  patch.title_romaji = meta.title_romaji;

  if (Object.keys(patch).length) {
    await supabase.from("anime").update(patch).eq("title_jp", title);
  }
  return patch.image_url || cached?.image_url || null;
}

/* -------------------------------------------------------
   ③ アニメ詳細
------------------------------------------------------- */
export async function getAnimeBasic(id) {
  const { data, error } = await supabase
    .from("anime")
    .select("id, title_jp, title_en, title_romaji, release_year, release_season, type, image_url, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getAnimeBasic error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ④ アニメ詳細 + 曲一覧
------------------------------------------------------- */
export async function getAnimeDetail(id) {
  const anime = await getAnimeBasic(id);
  if (!anime) return null;

  const { data: songsData, error } = await supabase
    .from("songs")
    .select(`
      song_id:id,
      song_title,
      song_type,
      image_url,
      artist:artists!artist_id ( name )
    `)
    .eq("anime_id", id)
    .order("song_type", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("getAnimeDetail songs error:", error);
    return { anime, songs: [] };
  }

  const formatted = (songsData ?? []).map((row) => ({
    song_id: row.song_id,
    song_title: row.song_title,
    song_type: row.song_type,
    image_url: row.image_url,
    artist: row.artist?.name ?? null
  }));

  // 画像取得は呼び出し側でバックグラウンド実行させ、詳細表示をブロックしない
  return { anime, songs: formatted };
}
