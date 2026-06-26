import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { ITUNES_SEARCH_API } from "../constants";

/* -------------------------------------------------------
   🚀 アーティスト画像を iTunes(JP) から取得し DB にキャッシュ
   - iTunes の musicArtist には artwork が無いため、
     そのアーティスト名で曲を検索し、artistName が一致する
     曲のジャケットをアーティスト画像として採用する
   - 一致が無ければ null（誤った画像を付けない）
------------------------------------------------------- */
export async function ensureArtistImage(artist) {
  if (!artist) return null;
  if (artist.image_url) return artist.image_url;
  if (!artist.name) return null;

  const name = normalizeText(artist.name);
  const url = `${ITUNES_SEARCH_API}?term=${encodeURIComponent(name)}&entity=song&country=JP&limit=10`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const match = (data?.results ?? []).find((r) => {
      if (!r.artworkUrl100) return false;
      const ra = normalizeText(r.artistName || "");
      return ra && (ra === name || ra.includes(name) || name.includes(ra));
    });
    if (!match) return null;

    const artwork = match.artworkUrl100.replace("100x100", "600x600");

    await supabase.from("artists").update({ image_url: artwork }).eq("id", artist.id);

    return artwork;
  } catch (err) {
    console.error("artistImageCache error:", err);
    return null;
  }
}

// 並列数を制限しながら順序を保ってアーティスト画像を補完する
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function ensureArtistImages(artists) {
  return mapWithConcurrency(artists, 6, async (artist) => {
    if (artist.image_url) return artist;
    const image_url = await ensureArtistImage(artist);
    return { ...artist, image_url };
  });
}
