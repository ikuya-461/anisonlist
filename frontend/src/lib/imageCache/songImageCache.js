import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { ITUNES_SEARCH_API } from "../constants";

/* -------------------------------------------------------
   🚀 曲画像を iTunes API で検索し、未キャッシュなら DB に保存
------------------------------------------------------- */
export async function ensureSongImage(song) {
  if (song.image_url) return song.image_url;
  if (!song.song_title || !song.artist) return null;

  const title = normalizeText(song.song_title);
  // ボカロ等は複数アーティストが ", " 連結されるため、検索は先頭1名のみ使う
  // （連結したままだと iTunes がほぼマッチしない）
  const artist = normalizeText(song.artist).split(",")[0].trim();

  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `${ITUNES_SEARCH_API}?term=${query}&entity=song&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const artwork = data?.results?.[0]?.artworkUrl100?.replace("100x100", "600x600");
    if (!artwork) return null;

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
