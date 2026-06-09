import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { JIKAN_API_BASE, JIKAN_REQUEST_INTERVAL_MS } from "../constants";

/* -------------------------------------------------------
   🚀 アニメ画像を Jikan API で検索し、未キャッシュなら DB に保存
------------------------------------------------------- */
export async function ensureAnimeImage(anime) {
  if (anime.image_url) return anime.image_url;
  if (!anime.title_jp) return null;

  try {
    const jikanRes = await fetch(
      `${JIKAN_API_BASE}/anime?q=${encodeURIComponent(normalizeText(anime.title_jp))}&limit=1`
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
   ※ Jikan APIは 3 req/秒までのレート制限があるため、
     並列実行ではなく一定間隔をあけて順番に呼び出す
------------------------------------------------------- */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function ensureAnimeImages(animeList) {
  const results = [];

  for (const anime of animeList) {
    if (anime.image_url) {
      results.push(anime);
      continue;
    }

    const image_url = await ensureAnimeImage(anime);
    results.push({ ...anime, image_url });
    await sleep(JIKAN_REQUEST_INTERVAL_MS);
  }

  return results;
}
