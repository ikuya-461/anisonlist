import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";

/* -------------------------------------------------------
   🚀 アニメ画像を Jikan API で検索し、未キャッシュなら DB に保存
------------------------------------------------------- */
export async function ensureAnimeImage(anime) {
  if (anime.image_url) return anime.image_url;
  if (!anime.title_jp) return null;

  try {
    const jikanRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(normalizeText(anime.title_jp))}&limit=1`
    );

    const data = await jikanRes.json();

    const image =
      data?.data?.[0]?.images?.jpg?.large_image_url ||
      data?.data?.[0]?.images?.jpg?.image_url ||
      null;

    if (!image) return null;

    await supabase.from("anime").update({ image_url: image }).eq("id", anime.id);

    return image;
  } catch (err) {
    console.error("animeImageCache error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   🚀 アニメ一覧の中で image_url が無いものをまとめてキャッシュ
------------------------------------------------------- */
export async function ensureAnimeImages(animeList) {
  return Promise.all(
    animeList.map(async (anime) => {
      if (anime.image_url) return anime;
      const image_url = await ensureAnimeImage(anime);
      return { ...anime, image_url };
    })
  );
}
