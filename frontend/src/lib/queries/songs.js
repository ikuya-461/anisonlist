import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureSongImages } from "../imageCache/songImageCache";
import { calcRange, calcTotalPages } from "../utils/pagination";

const buildSearchSelect = ({ needArtistJoin, needAnimeJoin }) => `
  id,
  song_title,
  song_type,
  image_url,
  artist:artists!artist_id${needArtistJoin ? "!inner" : ""} ( name ),
  anime:anime!anime_id${needAnimeJoin ? "!inner" : ""} ( title_jp )
`;

const formatSearchRow = (row) => ({
  id: row.id,
  song_title: row.song_title,
  song_type: row.song_type,
  image_url: row.image_url,
  artist: row.artist?.name ?? null,
  anime_title: row.anime?.title_jp ?? null
});

/* -------------------------------------------------------
   ① 曲一覧（複合検索 + ページネーション）
------------------------------------------------------- */
export async function searchSongs({
  keyword: rawKeyword = "",
  artist: rawArtist = "",
  anime: rawAnime = "",
  type = "",
  page = 1
} = {}) {
  const keyword = normalizeText(rawKeyword);
  const artist = normalizeText(rawArtist);
  const anime = normalizeText(rawAnime);

  const { from, to } = calcRange(page);

  const select = buildSearchSelect({
    needArtistJoin: Boolean(artist),
    needAnimeJoin: Boolean(anime)
  });

  let query = supabase
    .from("songs")
    .select(select, { count: "exact" })
    .order("id", { ascending: true })
    .range(from, to);

  if (keyword) query = query.ilike("song_title", `%${keyword}%`);
  if (artist) query = query.ilike("artists.name", `%${artist}%`);
  if (anime) query = query.ilike("anime.title_jp", `%${anime}%`);
  if (type) query = query.eq("song_type", type);

  const { data, error, count } = await query;

  if (error) {
    console.error("searchSongs error:", error);
    return { songs: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const songs = await ensureSongImages((data ?? []).map(formatSearchRow));

  return {
    songs,
    total: count ?? 0,
    page: Number(page),
    totalPages: calcTotalPages(count),
  };
}

/* -------------------------------------------------------
   ② 曲詳細
------------------------------------------------------- */
export async function getSongDetail(id) {
  const { data, error } = await supabase
    .from("songs")
    .select(`
      id,
      song_title,
      song_type,
      song_info,
      image_url,
      anime_id,
      artist_id,
      lyricist_id,
      composer_id,
      arranger_id,
      created_at,
      anime:anime!anime_id ( title_jp, release_date ),
      artist:artists!artist_id ( name ),
      lyricist:artists!lyricist_id ( name ),
      composer:artists!composer_id ( name ),
      arranger:artists!arranger_id ( name )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("getSongDetail error:", error);
    return null;
  }

  return {
    ...data,
    anime_title: data.anime?.title_jp ?? null,
    release_date: data.anime?.release_date ?? null,
    artist: data.artist?.name ?? null,
    lyricist: data.lyricist?.name ?? null,
    composer: data.composer?.name ?? null,
    arranger: data.arranger?.name ?? null
  };
}
