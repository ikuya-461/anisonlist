import { supabase } from "../supabaseClient";
import { ANILIST_API } from "../constants";
import { buildAnimeQueries, pickBestAnime, ANILIST_MEDIA_QUERY } from "./animeMatch.js";

/* -------------------------------------------------------
   AniList でアニメのカバー画像＋英題/ローマ字を検索する共通ヘルパー
   （Jikanは504頻発・日本語検索に弱いため AniList に移行）
   - 判定は animeMatch.js（測定ツールと共通）。発売年が分かれば年の差で続編・リメイクを弾き、
     分からなければ題名の完全一致だけを採用する
   - 候補が無ければ、副題・期数を落とした題名、英題の順で探し直す
   - 画像と同時に英語タイトル・ローマ字も取得してDBにキャッシュする
------------------------------------------------------- */
// アプリが 1 作品に送る検索の上限（3 つ目の英題は測定で 1 件も増えなかったため一括取得だけで使う）
const APP_MAX_QUERIES = 2;

async function searchAniList(term) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_MEDIA_QUERY, variables: { s: term } })
  });
  const data = await res.json();
  return data?.data?.Page?.media ?? [];
}

/**
 * AniList から画像＋英題/ローマ字をまとめて取得
 * @param {{ title_jp?: string, title_en?: string, release_year?: number }} anime
 * @returns {{ cover: string|null, title_en: string|null, title_romaji: string|null } | null}
 */
export async function fetchAnimeMeta(anime) {
  if (!anime?.title_jp && !anime?.title_en) return null;
  try {
    for (const term of buildAnimeQueries(anime).slice(0, APP_MAX_QUERIES)) {
      const match = pickBestAnime(anime, await searchAniList(term));
      if (!match) continue;
      const cover = match.coverImage;
      return {
        cover: cover?.extraLarge || cover?.large || null,
        title_en: match.title?.english || null,
        title_romaji: match.title?.romaji || null
      };
    }
    return null;
  } catch (err) {
    console.error("animeImageCache(AniList) error:", err);
    return null;
  }
}

/* 後方互換：カバー画像だけ欲しい呼び出し向け */
export async function fetchAnimeCover(anime) {
  const meta = await fetchAnimeMeta(anime);
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

  const meta = await fetchAnimeMeta(anime);
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
