import fetch from "node-fetch";
import { normalizeText } from "./normalize.js";

/* -------------------------------------------------------
   🚀 曲画像を iTunes API で検索し、未キャッシュなら DB に保存
   （曲検索 / 曲詳細で使っているのと同じロジック）
------------------------------------------------------- */
export async function ensureSongImage(pool, song) {
  if (song.image_url) return song.image_url;
  if (!song.song_title || !song.artist) return null;

  // ★ 全角/半角・余分な空白・大文字小文字によるミスマッチを軽減
  const title = normalizeText(song.song_title);
  const artist = normalizeText(song.artist);

  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const artwork = data?.results?.[0]?.artworkUrl100?.replace("100x100", "600x600");
    if (!artwork) return null;

    await pool.query("UPDATE songs SET image_url = $1 WHERE id = $2", [
      artwork,
      song.song_id ?? song.id
    ]);

    return artwork;
  } catch (err) {
    console.error("songImageCache error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   🚀 曲一覧の中で image_url が無いものをまとめてキャッシュ
------------------------------------------------------- */
export async function ensureSongImages(pool, songs) {
  return Promise.all(
    songs.map(async (song) => {
      if (song.image_url) return song;
      const image_url = await ensureSongImage(pool, song);
      return { ...song, image_url };
    })
  );
}
