import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureSongImages } from "../imageCache/songImageCache";

const PAGE_SIZE = 10;

/* -------------------------------------------------------
   ① アーティスト一覧（検索 + ページネーション）
------------------------------------------------------- */
export async function searchArtists({ keyword: rawKeyword = "", page = 1 } = {}) {
  const keyword = normalizeText(rawKeyword);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("artists")
    .select("id, name, role, created_at", { count: "exact" })
    .order("id", { ascending: true })
    .range(from, to);

  if (keyword) query = query.ilike("name", `%${keyword}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error("searchArtists error:", error);
    return { artists: [], total: 0, page: Number(page), totalPages: 1 };
  }

  return {
    artists: data ?? [],
    total: count ?? 0,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  };
}

/* -------------------------------------------------------
   ② アーティスト詳細（基本情報）
------------------------------------------------------- */
export async function getArtistBasic(id) {
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, role, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getArtistBasic error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ③ アーティスト詳細 + 担当曲一覧
   （歌手・作詞・作曲・編曲のいずれかで関わった曲をすべて取得）
------------------------------------------------------- */
export async function getArtistDetail(id) {
  const artist = await getArtistBasic(id);
  if (!artist) return null;

  const { data: songsData, error } = await supabase
    .from("songs")
    .select(`
      song_id:id,
      song_title,
      song_type,
      image_url,
      anime:anime!anime_id ( title_jp ),
      artist:artists!artist_id ( name )
    `)
    .or(`artist_id.eq.${id},lyricist_id.eq.${id},composer_id.eq.${id},arranger_id.eq.${id}`)
    .order("id", { ascending: true });

  if (error) {
    console.error("getArtistDetail songs error:", error);
    return { artist, songs: [] };
  }

  const formatted = (songsData ?? []).map((row) => ({
    song_id: row.song_id,
    song_title: row.song_title,
    song_type: row.song_type,
    image_url: row.image_url,
    anime_title: row.anime?.title_jp ?? null,
    artist: row.artist?.name ?? null
  }));

  const songs = await ensureSongImages(formatted);

  return { artist, songs };
}
