import { supabase } from "../supabaseClient";
import { ANILIST_API } from "../constants";

/* -------------------------------------------------------
   AniList でアニメのカバー画像＋英題/ローマ字を検索する共通ヘルパー
   （Jikanは504頻発・日本語検索に弱いため AniList に移行）
   - 日本語(native)/ローマ字(romaji)/英語どのタイトルでも検索可
   - 画像と同時に英語タイトル・ローマ字も取得してDBにキャッシュする
------------------------------------------------------- */
const ANILIST_QUERY = `query ($s: String) {
  Media(search: $s, type: ANIME) {
    title { english romaji }
    coverImage { large extraLarge }
  }
}`;

/**
 * AniList から画像＋英題/ローマ字をまとめて取得
 * @returns {{ cover: string|null, title_en: string|null, title_romaji: string|null } | null}
 */
export async function fetchAnimeMeta(title) {
  if (!title) return null;
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { s: title } })
    });
    const data = await res.json();
    const media = data?.data?.Media;
    if (!media) return null;
    const cover = media.coverImage;
    return {
      cover: cover?.extraLarge || cover?.large || null,
      title_en: media.title?.english || null,
      title_romaji: media.title?.romaji || null
    };
  } catch (err) {
    console.error("animeImageCache(AniList) error:", err);
    return null;
  }
}

/* 後方互換：カバー画像だけ欲しい呼び出し向け */
export async function fetchAnimeCover(title) {
  const meta = await fetchAnimeMeta(title);
  return meta?.cover ?? null;
}

/* -------------------------------------------------------
   🚀 アニメの画像・英題・ローマ字のうち欠けているものを取得しDBに保存
   - 必要なフィールドが全て揃っていればAPIを叩かない
   - 取得できた差分だけを patch として返す（UIが即時反映できるように）
------------------------------------------------------- */
export async function ensureAnimeMeta(anime) {
  const needImage  = !anime.image_url;
  const needEn     = !anime.title_en;
  const needRomaji = !anime.title_romaji;
  if (!needImage && !needEn && !needRomaji) return {};
  if (!anime.title_jp && !anime.title_en) return {};

  const meta = await fetchAnimeMeta(anime.title_jp || anime.title_en);
  if (!meta) return {};

  const patch = {};
  if (needImage && meta.cover)         patch.image_url    = meta.cover;
  if (needEn && meta.title_en)         patch.title_en     = meta.title_en;
  if (needRomaji && meta.title_romaji) patch.title_romaji = meta.title_romaji;

  if (Object.keys(patch).length && anime.id) {
    await supabase.from("anime").update(patch).eq("id", anime.id);
  }
  return patch;
}

/* 後方互換：画像URLだけ返す（呼び出し側が image_url を期待するケース） */
export async function ensureAnimeImage(anime) {
  const patch = await ensureAnimeMeta(anime);
  return patch.image_url || anime.image_url || null;
}

/* -------------------------------------------------------
   🚀 アニメ一覧の中で欠けている画像・英題をまとめてキャッシュ
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
    const patch = await ensureAnimeMeta(anime);
    return { ...anime, ...patch };
  });
}
