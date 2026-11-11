import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
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

  // 画像取得(iTunes API)は呼び出し側でバックグラウンド実行させ、結果表示をブロックしない
  return {
    songs: rows,
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
      title_en,
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
      anime:anime!anime_id ( title_jp, release_date, image_url ),
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
    // 曲の画像が無いときに代わりに出す作品の表紙（songDisplayImage）
    anime_image_url: data.anime?.image_url ?? null,
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

  // 画像取得(iTunes API)は呼び出し側でバックグラウンド実行させ、詳細表示をブロックしない

  // 曲名が既にラテン文字表記なら、それをそのまま英題としてキャッシュ（API不要）
  // 例: "oath sign", "God knows..."。日本語表記の曲はローマ字変換が要るため対象外
  if (!result.title_en && result.song_title && !/[぀-ヿ一-龯]/.test(result.song_title)) {
    result.title_en = result.song_title;
    await supabase.from("songs").update({ title_en: result.song_title }).eq("id", result.id);
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
