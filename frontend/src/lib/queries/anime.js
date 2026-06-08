import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureAnimeImages } from "../imageCache/animeImageCache";
import { ensureSongImages } from "../imageCache/songImageCache";

const PAGE_SIZE = 10;

/* -------------------------------------------------------
   ① アニメ一覧（検索 + ページネーション）
------------------------------------------------------- */
export async function searchAnime({ keyword: rawKeyword = "", page = 1 } = {}) {
  const keyword = normalizeText(rawKeyword);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("anime")
    .select("id, title_jp, title_en, release_year, release_season, type, image_url, created_at", {
      count: "exact"
    })
    .order("release_year", { ascending: false })
    .order("title_jp", { ascending: true })
    .range(from, to);

  if (keyword) {
    query = query.or(`title_jp.ilike.%${keyword}%,title_en.ilike.%${keyword}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("searchAnime error:", error);
    return { anime: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const anime = await ensureAnimeImages(data ?? []);

  return {
    anime,
    total: count ?? 0,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  };
}

/* -------------------------------------------------------
   ② アニメ画像取得（キャッシュ対応）
------------------------------------------------------- */
export async function getAnimeImage(title) {
  if (!title) return null;

  const { data: cached } = await supabase
    .from("anime")
    .select("image_url")
    .eq("title_jp", title)
    .limit(1)
    .maybeSingle();

  if (cached?.image_url) return cached.image_url;

  try {
    const jikanRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(normalizeText(title))}&limit=1`
    );
    const data = await jikanRes.json();

    const image =
      data?.data?.[0]?.images?.jpg?.large_image_url ||
      data?.data?.[0]?.images?.jpg?.image_url ||
      null;

    if (image) {
      await supabase.from("anime").update({ image_url: image }).eq("title_jp", title);
    }

    return image;
  } catch (err) {
    console.error("getAnimeImage error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   ③ アニメ詳細
------------------------------------------------------- */
export async function getAnimeBasic(id) {
  const { data, error } = await supabase
    .from("anime")
    .select("id, title_jp, title_en, release_year, release_season, type, image_url, created_at")
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

  const songs = await ensureSongImages(formatted);

  return { anime, songs };
}
