import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { RAWG_API, RAWG_API_KEY } from "../constants";

// 採用に必要な最低スコア（songImageCache と同じ閾値。誤った画像より NO IMAGE を優先）
const MATCH_THRESHOLD = 0.72;

// 文字バイグラムの Dice 係数（0〜1）で文字列類似度を測る
// 注意：RAWG は基本英語名/ローマ字名しか返さないため、title_jp が
// 日本語表記のゲームはスコアが低く出て不採用（=NO IMAGE）になりやすい。
// これは songImageCache と同じ「誤画像よりNO IMAGE」の方針に沿った意図的な挙動。
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

function pickBestMatch(queryTitle, results) {
  const qt = normalizeText(queryTitle);

  let best = null;
  let bestScore = 0;

  for (const r of results) {
    if (!r.background_image) continue;

    const rt = normalizeText(r.name || "");
    let score;
    if (rt && rt === qt) score = 1;
    else if (qt && rt && (rt.includes(qt) || qt.includes(rt))) score = 0.85;
    else score = similarity(qt, rt);

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/* -------------------------------------------------------
   RAWG でゲームのカバー画像を検索する共通ヘルパー
   - 複数候補を取得し、タイトル類似度でスコアリング
   - 閾値未満は採用せず null
------------------------------------------------------- */
/**
 * RAWG から画像＋英語タイトルをまとめて取得
 * @returns {{ cover: string|null, title_en: string|null } | null}
 */
export async function fetchGameMeta(title) {
  if (!title || !RAWG_API_KEY) return null;
  try {
    const url = `${RAWG_API}?key=${RAWG_API_KEY}&search=${encodeURIComponent(title)}&page_size=5`;
    const res = await fetch(url);
    const data = await res.json();
    const match = pickBestMatch(title, data?.results ?? []);
    if (!match) return null;
    return {
      cover: match.background_image || null,
      title_en: match.name || null  // RAWG は基本英語名を返す
    };
  } catch (err) {
    console.error("gameImageCache(RAWG) error:", err);
    return null;
  }
}

/* 後方互換：カバー画像だけ欲しい呼び出し向け */
export async function fetchGameCover(title) {
  const meta = await fetchGameMeta(title);
  return meta?.cover ?? null;
}

/* -------------------------------------------------------
   🚀 ゲームの画像・英題のうち欠けているものを取得しDBに保存
   - RAWGが確信を持ってマッチした時のみ title_en もキャッシュ
------------------------------------------------------- */
export async function ensureGameMeta(game) {
  const needImage = !game.image_url;
  const needEn    = !game.title_en;
  if (!needImage && !needEn) return {};
  if (!game.title_jp) return {};

  const meta = await fetchGameMeta(game.title_jp);
  if (!meta) return {};

  const patch = {};
  if (needImage && meta.cover)    patch.image_url = meta.cover;
  if (needEn && meta.title_en)    patch.title_en  = meta.title_en;

  if (Object.keys(patch).length && game.id) {
    await supabase.from("games").update(patch).eq("id", game.id);
  }
  return patch;
}

/* 後方互換：画像URLだけ返す */
export async function ensureGameImage(game) {
  const patch = await ensureGameMeta(game);
  return patch.image_url || game.image_url || null;
}

/* -------------------------------------------------------
   🚀 ゲーム一覧の中で image_url が無いものをまとめてキャッシュ
   並列数はアニメと同じ3に制限（外部APIへの配慮）
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

export async function ensureGameImages(gameList) {
  return mapWithConcurrency(gameList, 3, async (game) => {
    const patch = await ensureGameMeta(game);
    return { ...game, ...patch };
  });
}

/* -------------------------------------------------------
   単体取得（DBキャッシュ優先、未キャッシュならRAWGへ）
------------------------------------------------------- */
export async function getGameImage(title) {
  if (!title) return null;

  const { data: cached } = await supabase
    .from("games")
    .select("image_url, title_en")
    .eq("title_jp", title)
    .limit(1)
    .maybeSingle();

  // 画像・英題が揃っていればAPIを叩かない
  if (cached?.image_url && cached?.title_en) return cached.image_url;

  const meta = await fetchGameMeta(title);
  if (!meta) return cached?.image_url ?? null;

  const patch = {};
  if (!cached?.image_url && meta.cover)   patch.image_url = meta.cover;
  if (!cached?.title_en && meta.title_en) patch.title_en  = meta.title_en;

  if (Object.keys(patch).length) {
    await supabase.from("games").update(patch).eq("title_jp", title);
  }
  return patch.image_url || cached?.image_url || null;
}
