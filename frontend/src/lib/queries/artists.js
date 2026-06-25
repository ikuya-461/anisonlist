import { supabase } from "../supabaseClient";
import { normalizeText } from "../imageCache/normalize";
import { ensureSongImages } from "../imageCache/songImageCache";
import { calcRange, calcTotalPages } from "../utils/pagination";

// 担当曲の取得上限（初音ミク等の多作ボーカルは数万曲ひも付くため、
// 一度に全件取得＋画像APIを叩くと破綻する。先頭 N 件のみ表示する）
const ARTIST_SONGS_LIMIT = 100;

/* -------------------------------------------------------
   ① アーティスト一覧（検索 + ページネーション）
------------------------------------------------------- */
export async function searchArtists({ keyword: rawKeyword = "", page = 1 } = {}) {
  const keyword = normalizeText(rawKeyword);

  const { from, to } = calcRange(page);

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
    totalPages: calcTotalPages(count),
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

  const songSelect = `
    song_id:id,
    song_title,
    song_type,
    category,
    image_url,
    anime:anime!anime_id ( title_jp ),
    artist:artists!artist_id ( name )
  `;

  // A) artist_id / lyricist / composer / arranger 経由（アニソン・VTuber：単一アーティスト列）
  const { data: directData, error: e1 } = await supabase
    .from("songs")
    .select(songSelect)
    .or(`artist_id.eq.${id},lyricist_id.eq.${id},composer_id.eq.${id},arranger_id.eq.${id}`)
    .order("id", { ascending: true })
    .limit(ARTIST_SONGS_LIMIT);

  // B) song_artists 経由（ボカロのボーカル / プロデューサー：多対多）
  const { data: linkData, error: e2 } = await supabase
    .from("song_artists")
    .select(`song:songs!song_id ( ${songSelect} )`)
    .eq("artist_id", id)
    .limit(ARTIST_SONGS_LIMIT);

  if (e1) console.error("getArtistDetail songs error:", e1);
  if (e2) console.error("getArtistDetail song_artists error:", e2);

  const rowsA = directData ?? [];
  const rowsB = (linkData ?? []).map((r) => r.song).filter(Boolean);

  // song_id でマージ・重複排除（A/B はアーティストのロール上ほぼ排他だが念のため）
  const byId = new Map();
  for (const row of [...rowsA, ...rowsB]) {
    if (row && !byId.has(row.song_id)) byId.set(row.song_id, row);
  }
  const merged = [...byId.values()]
    .sort((a, b) => a.song_id - b.song_id)
    .slice(0, ARTIST_SONGS_LIMIT);

  const formatted = merged.map((row) => ({
    song_id: row.song_id,
    song_title: row.song_title,
    song_type: row.song_type,
    image_url: row.image_url,
    anime_title: row.anime?.title_jp ?? null,
    // ボカロ曲はボーカル名が別ひも付けのため、表示・画像検索ともこのアーティスト名を使う
    artist: row.category === "vocaloid" ? artist.name : (row.artist?.name ?? null)
  }));

  const songs = await ensureSongImages(formatted);

  return { artist, songs };
}
