import { supabase } from "../supabaseClient";
import { ANILIST_API } from "../constants";

/* -------------------------------------------------------
   AniList でアニメのカバー画像を検索する共通ヘルパー
   （Jikanは504頻発・日本語検索に弱いため AniList に移行）
   - 日本語(native)/ローマ字(romaji)/英語どのタイトルでも検索可
------------------------------------------------------- */
const ANILIST_QUERY = `query ($s: String) {
  Media(search: $s, type: ANIME) {
    coverImage { large extraLarge }
  }
}`;

export async function fetchAnimeCover(title) {
  if (!title) return null;
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { s: title } })
    });
    const data = await res.json();
    const cover = data?.data?.Media?.coverImage;
    return cover?.extraLarge || cover?.large || null;
  } catch (err) {
    console.error("animeImageCache(AniList) error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   🚀 アニメ画像を取得し、未キャッシュなら DB に保存
------------------------------------------------------- */
export async function ensureAnimeImage(anime) {
  if (anime.image_url) return anime.image_url;
  if (!anime.title_jp && !anime.title_en) return null;

  const image = await fetchAnimeCover(anime.title_jp || anime.title_en);
  if (!image) return null;

  await supabase.from("anime").update({ image_url: image }).eq("id", anime.id);
  return image;
}

/* -------------------------------------------------------
   🚀 アニメ一覧の中で image_url が無いものをまとめてキャッシュ
   AniList は安定しているので並列数を絞って順序維持で処理
------------------------------------------------------- */
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

export async function ensureAnimeImages(animeList) {
  return mapWithConcurrency(animeList, 3, async (anime) => {
    if (anime.image_url) return anime;
    const image_url = await ensureAnimeImage(anime);
    return { ...anime, image_url };
  });
}
