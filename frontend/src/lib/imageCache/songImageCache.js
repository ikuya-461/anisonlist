import { supabase } from "../supabaseClient";
import { buildSongQueries, itunesSearchUrl, pickBestSong } from "./songMatch.js";

// アプリが 1 曲に送る検索の上限（多いと iTunes の回数制限に掛かりやすい。残りは一括取得で補う）
const APP_MAX_QUERIES = 2;

async function findSongArtwork(song) {
  for (const q of buildSongQueries(song).slice(0, APP_MAX_QUERIES)) {
    const response = await fetch(itunesSearchUrl(q.term, q.limit));
    const data = await response.json();
    const match = pickBestSong(song, data?.results ?? []);
    if (match) return match;
  }
  return null;
}

/* -------------------------------------------------------
   🚀 曲画像を iTunes API で検索し、未キャッシュなら DB に保存
   - 判定は songMatch.js（一括取得と共通）。歌手が一致しない候補は採用しない
   - 一致しなければ版の表記を落とした検索語でもう一度探す
   - 閾値未満は採用せず null（誤った画像を付けるより NO IMAGE を選ぶ）
------------------------------------------------------- */
export async function ensureSongImage(song) {
  if (song.image_url) return song.image_url;
  if (!song.song_title || !song.artist) return null;

  try {
    const match = await findSongArtwork(song);
    if (!match) return null;

    const artwork = match.artworkUrl100.replace("100x100", "600x600");

    await supabase
      .from("songs")
      .update({ image_url: artwork })
      .eq("id", song.song_id ?? song.id);

    return artwork;
  } catch (err) {
    console.error("songImageCache error:", err);
    return null;
  }
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
  return mapWithConcurrency(songs, 6, async (song) => {
    if (song.image_url) return song;
    const image_url = await ensureSongImage(song);
    return { ...song, image_url };
  });
}
