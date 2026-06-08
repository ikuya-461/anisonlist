import fetch from "node-fetch";
import { normalizeText } from "./normalize.js";

/* -------------------------------------------------------
   🚀 アニメ画像を Jikan API で検索し、未キャッシュなら DB に保存
   （アニメ詳細の /image/search で使っているのと同じロジック）
------------------------------------------------------- */
export async function ensureAnimeImage(pool, anime) {
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

    await pool.query("UPDATE anime SET image_url = $1 WHERE id = $2", [
      image,
      anime.id
    ]);

    return image;
  } catch (err) {
    console.error("animeImageCache error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   🚀 アニメ一覧の中で image_url が無いものをまとめてキャッシュ
------------------------------------------------------- */
export async function ensureAnimeImages(pool, animeList) {
  return Promise.all(
    animeList.map(async (anime) => {
      if (anime.image_url) return anime;
      const image_url = await ensureAnimeImage(pool, anime);
      return { ...anime, image_url };
    })
  );
}
