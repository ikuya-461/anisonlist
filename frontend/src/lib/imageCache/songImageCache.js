import { supabase } from "../supabaseClient";
import { buildSongQueries, itunesSearchUrl, pickBestSong } from "./songMatch.js";

// アプリが 1 曲に送る検索の上限（多いと iTunes の回数制限に掛かりやすい。残りは一括取得で補う）
const APP_MAX_QUERIES = 2;

// 一括取得が探して見つからなかった曲を、アプリが探し直すまでの期間
const RECHECK_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

async function findSongArtwork(song) {
  for (const q of buildSongQueries(song).slice(0, APP_MAX_QUERIES)) {
    const response = await fetch(itunesSearchUrl(q.term, q.limit));
    const data = await response.json();
    const match = pickBestSong(song, data?.results ?? []);
    if (match) return match;
  }
  return null;
}

const songIdOf = (song) => song.song_id ?? song.id;
const canSearch = (song) => Boolean(song.song_title && song.artist);

// ids のうち、一括取得が最近探して見つからなかった曲の id を返す（読めなければ空＝これまでどおり探す）
async function fetchRecentlyCheckedIds(ids) {
  const { data, error } = await supabase
    .from("songs")
    .select("id, image_checked_at")
    .in("id", ids);
  if (error) return new Set();

  const since = Date.now() - RECHECK_AFTER_MS;
  return new Set(
    (data ?? [])
      .filter((row) => row.image_checked_at && new Date(row.image_checked_at).getTime() > since)
      .map((row) => row.id)
  );
}

async function searchAndSaveSongImage(song) {
  try {
    const match = await findSongArtwork(song);
    if (!match) return null;

    const artwork = match.artworkUrl100.replace("100x100", "600x600");

    await supabase
      .from("songs")
      .update({ image_url: artwork })
      .eq("id", songIdOf(song));

    return artwork;
  } catch (err) {
    console.error("songImageCache error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   🚀 曲画像を iTunes API で検索し、未キャッシュなら DB に保存
   - 判定は songMatch.js（一括取得と共通）。歌手が一致しない候補は採用しない
   - 一致しなければ版の表記を落とした検索語でもう一度探す
   - 閾値未満は採用せず null（誤った画像を付けるより NO IMAGE を選ぶ）
   - 一括取得が最近探して見つからなかった曲は iTunes に問い合わせない
------------------------------------------------------- */
export async function ensureSongImage(song) {
  if (song.image_url) return song.image_url;
  if (!canSearch(song)) return null;

  const recent = await fetchRecentlyCheckedIds([songIdOf(song)]);
  if (recent.has(songIdOf(song))) return null;
  return searchAndSaveSongImage(song);
}

/* -------------------------------------------------------
   🚀 曲一覧の中で image_url が無いものをまとめてキャッシュ
------------------------------------------------------- */
// 並列数を制限しながら順序を保って map する
// （アーティスト詳細で最大100曲を一度に処理する際、iTunes へ同時大量
//   リクエストを投げるとレート制限/接続枯渇で取りこぼすため）
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export async function ensureSongImages(songs) {
  const targets = songs.filter((song) => !song.image_url && canSearch(song));
  if (targets.length === 0) return songs;

  // 記録は 1 曲ずつではなく、一覧の分をまとめて 1 回で読む
  const recent = await fetchRecentlyCheckedIds(targets.map(songIdOf));
  const searchable = new Set(targets.filter((song) => !recent.has(songIdOf(song))));

  return mapWithConcurrency(songs, 6, async (song) => {
    if (song.image_url) return song;
    const image_url = searchable.has(song) ? await searchAndSaveSongImage(song) : null;
    return { ...song, image_url };
  });
}
