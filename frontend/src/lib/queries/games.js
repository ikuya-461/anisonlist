import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureSongImages } from "../imageCache/songImageCache";
import { ensureGameImages, getGameImage } from "../imageCache/gameImageCache";
import { calcRange, calcTotalPages } from "../utils/pagination";

/* -------------------------------------------------------
   ① ゲーム一覧（検索 + ページネーション）
------------------------------------------------------- */
export async function searchGames({ keyword: rawKeyword = "", year = "", page = 1 } = {}) {
  const keyword = normalizeText(rawKeyword);

  const { from, to } = calcRange(page);

  let query = supabase
    .from("games")
    .select("id, title_jp, title_en, release_year, image_url, created_at", { count: "exact" })
    .order("release_year", { ascending: false })
    .order("title_jp", { ascending: true })
    .range(from, to);

  if (keyword) query = query.ilike("title_jp", `%${keyword}%`);
  if (year) query = query.eq("release_year", Number(year));

  const { data, error, count } = await query;

  if (error) {
    console.error("searchGames error:", error);
    return { games: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const games = await ensureGameImages(data ?? []);

  return {
    games,
    total: count ?? 0,
    page: Number(page),
    totalPages: calcTotalPages(count),
  };
}

export { getGameImage };

/* -------------------------------------------------------
   ② ゲーム詳細（基本情報）
------------------------------------------------------- */
export async function getGameBasic(id) {
  const { data, error } = await supabase
    .from("games")
    .select("id, title_jp, title_en, release_year, image_url, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getGameBasic error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ③ ゲーム詳細 + 曲一覧
------------------------------------------------------- */
export async function getGameDetail(id) {
  const game = await getGameBasic(id);
  if (!game) return null;

  const { data: songsData, error } = await supabase
    .from("songs")
    .select(`
      song_id:id,
      song_title,
      song_type,
      song_info,
      image_url,
      artist:artists!artist_id ( name )
    `)
    .eq("game_id", id)
    .order("song_type", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("getGameDetail songs error:", error);
    return { game, songs: [] };
  }

  const formatted = (songsData ?? []).map((row) => ({
    song_id: row.song_id,
    song_title: row.song_title,
    song_type: row.song_type,
    song_info: row.song_info,
    image_url: row.image_url,
    artist: row.artist?.name ?? null
  }));

  const songs = await ensureSongImages(formatted);

  return { game, songs };
}
