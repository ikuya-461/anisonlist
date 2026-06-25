import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureSongImages } from "../imageCache/songImageCache";
import { calcRange, calcTotalPages } from "../utils/pagination";

const buildSearchSelect = ({ needArtistJoin, needAnimeJoin }) => `
  id,
  song_title,
  song_type,
  category,
  image_url,
  artist:artists!artist_id${needArtistJoin ? "!inner" : ""} ( name ),
  anime:anime!anime_id${needAnimeJoin ? "!inner" : ""} ( title_jp ),
  song_artists ( role, artist:artists!artist_id ( name ) )
`;

const formatSearchRow = (row) => {
  const links = row.song_artists ?? [];
  const vocalists = links
    .filter((l) => l.role === "vocalist")
    .map((l) => l.artist?.name)
    .filter(Boolean);
  const producers = links
    .filter((l) => l.role === "producer")
    .map((l) => l.artist?.name)
    .filter(Boolean);

  const isVocaloid = row.category === "vocaloid";

  return {
    id: row.id,
    song_title: row.song_title,
    song_type: row.song_type,
    category: row.category,
    image_url: row.image_url,
    // ボカロ曲は artist_id を持たず song_artists に紐付くため、
    // 表示はボーカル（artist枠）・プロデューサー（anime_title枠）に振り分ける
    artist: isVocaloid ? (vocalists.join(", ") || null) : (row.artist?.name ?? null),
    anime_title: isVocaloid ? (producers.join(", ") || null) : (row.anime?.title_jp ?? null),
    vocalists,
    producers
  };
};

/* -------------------------------------------------------
   ① 曲一覧（複合検索 + ページネーション）
------------------------------------------------------- */
export async function searchSongs({
  keyword: rawKeyword = "",
  artist: rawArtist = "",
  anime: rawAnime = "",
  type = "",
  category = "",
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
  if (category) query = query.eq("category", category);

  const { data, error, count } = await query;

  if (error) {
    console.error("searchSongs error:", error);
    return { songs: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const rows = (data ?? []).map(formatSearchRow);

  // 画像は iTunes API から取得（ボカロ/VTuber 含む全カテゴリ）
  const songs = await ensureSongImages(rows);

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
      category,
      release_date,
      image_url,
      youtube_id,
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
      arranger:artists!arranger_id ( name ),
      song_artists ( role, artist:artists!artist_id ( id, name ) )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("getSongDetail error:", error);
    return null;
  }

  const links = data.song_artists ?? [];
  const vocalists = links
    .filter((l) => l.role === "vocalist")
    .map((l) => ({ id: l.artist?.id ?? null, name: l.artist?.name }))
    .filter((a) => a.name);
  const producers = links
    .filter((l) => l.role === "producer")
    .map((l) => ({ id: l.artist?.id ?? null, name: l.artist?.name }))
    .filter((a) => a.name);

  return {
    ...data,
    anime_title: data.anime?.title_jp ?? null,
    // 曲自身の release_date を優先（ボカロ曲）、無ければ紐づくアニメの公開日
    release_date: data.release_date ?? data.anime?.release_date ?? null,
    artist: data.artist?.name ?? null,
    lyricist: data.lyricist?.name ?? null,
    composer: data.composer?.name ?? null,
    arranger: data.arranger?.name ?? null,
    vocalists,
    producers
  };
}

/* -------------------------------------------------------
   ③ YouTube ID 登録・更新
------------------------------------------------------- */
export async function updateYoutubeId(songId, youtubeId) {
  const { error } = await supabase
    .from("songs")
    .update({ youtube_id: youtubeId || null })
    .eq("id", songId);

  if (error) {
    console.error("updateYoutubeId error:", error);
    return false;
  }
  return true;
}
