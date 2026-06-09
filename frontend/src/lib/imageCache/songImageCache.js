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
  const artist = normalizeText(song.artist);

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
export async function ensureSongImages(songs) {
  return Promise.all(
    songs.map(async (song) => {
      if (song.image_url) return song;
      const image_url = await ensureSongImage(song);
      return { ...song, image_url };
    })
  );
}
