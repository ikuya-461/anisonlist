import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureSongImage, ensureSongImages } from "../imageCache/songImageCache";
import { calcRange, calcTotalPages } from "../utils/pagination";

// RPC search_songs の1行を画面表示用に整形
const formatRpcRow = (row) => {
  const isVocaloid = row.category === "vocaloid";
  const vocalists = row.vocalists ? row.vocalists.split(", ") : [];
  const producers = row.producers ? row.producers.split(", ") : [];

  return {
    id: row.id,
    song_title: row.song_title,
    song_type: row.song_type,
    category: row.category,
    image_url: row.image_url,
    // ボカロ曲は artist_id を持たず song_artists に紐付くため、
    // 表示はボーカル（artist枠）・プロデューサー（anime_title枠）に振り分ける
    artist: isVocaloid ? (row.vocalists || null) : (row.artist_name ?? null),
    anime_title: isVocaloid ? (row.producers || null) : (row.anime_title ?? null),
    vocalists,
    producers
  };
};

/* -------------------------------------------------------
   ① 曲一覧（複合検索 + ページネーション）
   歌手名は artist_id（アニソン/VTuber）と song_artists
   （ボカロのボーカル/プロデューサー）の両方にヒットする（RPC側）
------------------------------------------------------- */
export async function searchSongs({
  keyword: rawKeyword = "",
  artist: rawArtist = "",
  anime: rawAnime = "",
  type = "",
  category = "",
  year = "",
  page = 1
} = {}) {
  const keyword = normalizeText(rawKeyword);
  const artist = normalizeText(rawArtist);
  const anime = normalizeText(rawAnime);

  const { from } = calcRange(page);
  const limit = calcRange(1).to + 1; // = PAGE_SIZE

  const { data, error } = await supabase.rpc("search_songs", {
    p_keyword: keyword,
    p_artist: artist,
    p_anime: anime,
    p_type: type,
    p_category: category,
    p_year: year ? Number(year) : 0,
    p_limit: limit,
    p_offset: from
  });

  if (error) {
    console.error("searchSongs error:", error);
    return { songs: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const rows = (data ?? []).map(formatRpcRow);
  const total = data && data.length ? Number(data[0].total_count) : 0;

  // 画像は iTunes API から取得（ボカロ/VTuber 含む全カテゴリ）
  const songs = await ensureSongImages(rows);

  return {
    songs,
    total,
    page: Number(page),
    totalPages: calcTotalPages(total),
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
      game_id,
      artist_id,
      lyricist_id,
      composer_id,
      arranger_id,
      created_at,
      anime:anime!anime_id ( title_jp, release_date ),
      game:games!game_id ( title_jp ),
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

  const result = {
    ...data,
    anime_title: data.anime?.title_jp ?? null,
    game_title: data.game?.title_jp ?? null,
    // 曲自身の release_date を優先（ボカロ曲）、無ければ紐づくアニメの公開日
    release_date: data.release_date ?? data.anime?.release_date ?? null,
    artist: data.artist?.name ?? null,
    lyricist: data.lyricist?.name ?? null,
    composer: data.composer?.name ?? null,
    arranger: data.arranger?.name ?? null,
    vocalists,
    producers
  };

  // 画像未取得なら iTunes から取得（検索を経ず直リンクで来た場合の保険）
  if (!result.image_url) {
    const artistForImage = result.artist || vocalists.map((v) => v.name).join(", ");
    const image_url = await ensureSongImage({
      song_id: result.id,
      song_title: result.song_title,
      artist: artistForImage,
      image_url: null
    });
    if (image_url) result.image_url = image_url;
  }

  return result;
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
