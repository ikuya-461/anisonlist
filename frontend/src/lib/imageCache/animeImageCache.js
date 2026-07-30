import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { ANILIST_API } from "../constants";

/* -------------------------------------------------------
   AniList でアニメのカバー画像＋英題/ローマ字を検索する共通ヘルパー
   （Jikanは504頻発・日本語検索に弱いため AniList に移行）
   - 日本語(native)/ローマ字(romaji)/英語どのタイトルでも検索可
   - 画像と同時に英語タイトル・ローマ字も取得してDBにキャッシュする
   - 複数候補を取得し、タイトル類似度でスコアリング（songImageCache等と同じ方式）
------------------------------------------------------- */
const ANILIST_QUERY = `query ($s: String) {
  Page(perPage: 5) {
    media(search: $s, type: ANIME) {
      title { english romaji native }
      coverImage { large extraLarge }
      popularity
    }
  }
}`;

// 採用に必要な最低スコア（songImageCache/gameImageCacheと同じ閾値）
const MATCH_THRESHOLD = 0.72;

// 文字バイグラムの Dice 係数（0〜1）で文字列類似度を測る
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const big = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const A = big(a);
  const B = big(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// 候補の native/romaji/english のうち最も近いものでスコアリング
// 部分一致(0.85)は原作/続編/スピンオフ間で同点になりやすいため、
// スコアが同点の場合は popularity（人気度）が高い方を優先する
// （さもないとAniListの検索結果の並び順＝人気順ではない順で先勝ちしてしまい、
//   「ラブライブ!」で検索してスピンオフ「スーパースター!!」の画像が
//   付く、といった誤マッチが起きる）
function pickBestMatch(queryTitle, results) {
  const qt = normalizeText(queryTitle);

  let best = null;
  let bestScore = 0;
  let bestPopularity = -1;

  for (const r of results) {
    if (!r.coverImage?.large && !r.coverImage?.extraLarge) continue;

    const candidates = [r.title?.native, r.title?.romaji, r.title?.english]
      .filter(Boolean)
      .map(normalizeText);

    let score = 0;
    for (const c of candidates) {
      if (c === qt) { score = 1; break; }
      if (c.includes(qt) || qt.includes(c)) score = Math.max(score, 0.85);
      else score = Math.max(score, similarity(qt, c));
    }

    const popularity = r.popularity ?? 0;
    if (score > bestScore || (score === bestScore && popularity > bestPopularity)) {
      bestScore = score;
      bestPopularity = popularity;
      best = r;
    }
  }

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

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
    const results = data?.data?.Page?.media ?? [];
    const match = pickBestMatch(title, results);
    if (!match) return null;
    const cover = match.coverImage;
    return {
      cover: cover?.extraLarge || cover?.large || null,
      title_en: match.title?.english || null,
      title_romaji: match.title?.romaji || null
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
