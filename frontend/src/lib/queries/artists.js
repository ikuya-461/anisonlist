import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { calcRange, calcTotalPages } from "../utils/pagination";

// 担当曲の1ページ表示件数（初音ミク等は数万曲ひも付くためページング必須）
const ARTIST_SONGS_PAGE_SIZE = 30;

/* -------------------------------------------------------
   ① アーティスト一覧（検索 + ページネーション）
------------------------------------------------------- */
export async function searchArtists({ keyword: rawKeyword = "", page = 1 } = {}) {
  const keyword = normalizeText(rawKeyword);

  const limit = calcRange(1).to + 1; // = PAGE_SIZE
  const { from } = calcRange(page);

  // 曖昧検索(誤字許容)+関連度順ソートはRPC側で実施（search_songsと同じ方式）
  const { data, error } = await supabase.rpc("search_artists", {
    p_keyword: keyword,
    p_limit: limit,
    p_offset: from,
  });

  if (error) {
    console.error("searchArtists error:", error);
    return { artists: [], total: 0, page: Number(page), totalPages: 1 };
  }

  const count = data?.[0]?.total_count ?? 0;

  // 画像取得は呼び出し側でバックグラウンド実行させ、結果表示をブロックしない
  return {
    artists: data ?? [],
    total: count,
    page: Number(page),
    totalPages: calcTotalPages(count),
  };
}

/* -------------------------------------------------------
   ② アーティスト詳細（基本情報）
------------------------------------------------------- */
export async function getArtistBasic(id) {
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, name_en, role, image_url, created_at")
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
export async function getArtistDetail(id, page = 1) {
  const artist = await getArtistBasic(id);
  if (!artist) return null;

  // 画像・英語名の取得(iTunes/MusicBrainz)は呼び出し側でバックグラウンド実行させ、詳細表示をブロックしない

  const songSelect = `
    song_id:id,
    song_title,
    song_type,
    category,
    image_url,
    anime:anime!anime_id ( title_jp, image_url ),
    artist:artists!artist_id ( name )
  `;

  const p = Math.max(1, Number(page) || 1);
  const from = (p - 1) * ARTIST_SONGS_PAGE_SIZE;
  const to = from + ARTIST_SONGS_PAGE_SIZE - 1;

  // role でひも付け元が一意に決まる:
  //   vocalist / producer … ボカロ曲（song_artists 中間テーブル経由）
  //   それ以外(artist 等) … アニソン・VTuber（songs の直接列経由）
  const viaSongArtists = artist.role === "vocalist" || artist.role === "producer";

  let rows = [];
  let total = 0;

  if (viaSongArtists) {
    const { data, error, count } = await supabase
      .from("song_artists")
      .select(`song:songs!song_id ( ${songSelect} )`, { count: "exact" })
      .eq("artist_id", id)
      .order("song_id", { ascending: true })
      .range(from, to);
    if (error) console.error("getArtistDetail song_artists error:", error);
    rows = (data ?? []).map((r) => r.song).filter(Boolean);
    total = count ?? 0;
  } else {
    const { data, error, count } = await supabase
      .from("songs")
      .select(songSelect, { count: "exact" })
      .or(`artist_id.eq.${id},lyricist_id.eq.${id},composer_id.eq.${id},arranger_id.eq.${id}`)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) console.error("getArtistDetail songs error:", error);
    rows = data ?? [];
    total = count ?? 0;
  }

  const formatted = rows.map((row) => ({
    song_id: row.song_id,
    song_title: row.song_title,
    song_type: row.song_type,
    image_url: row.image_url,
    anime_title: row.anime?.title_jp ?? null,
    // 曲の画像が無いときに代わりに出す作品の表紙（songDisplayImage）
    anime_image_url: row.anime?.image_url ?? null,
    // ボカロ曲はボーカル名が別ひも付けのため、表示・画像検索ともこのアーティスト名を使う
    artist: row.category === "vocaloid" ? artist.name : (row.artist?.name ?? null)
  }));

  // 画像取得は呼び出し側でバックグラウンド実行させ、詳細表示をブロックしない
  return {
    artist,
    songs: formatted,
    page: p,
    total,
    totalPages: Math.max(1, Math.ceil(total / ARTIST_SONGS_PAGE_SIZE))
  };
}
