/* =========================================================
   アニメ作品の画像の判定（AniList の検索結果から採用する 1 件を選ぶ）
   - アプリ（animeImageCache）と測定ツール（tools/image-accuracy）で共通に使う
   - 方針：誤った画像を付けるより NO IMAGE
     （2026-10-30 の測定で、誤りはすべて続編・リメイク・特別編だった）
   - 発売年が分かれば年の差で別作品を弾く。分からなければ題名の完全一致だけを採用する
   ========================================================= */
import { normalizeText } from "./normalize.js";
import { looseKey, compareKeys } from "./songMatch.js";

// AniList への問い合わせ（年で続編・リメイクを見分けるため startDate・別名も取る）
export const ANILIST_MEDIA_QUERY = `query ($s: String) {
  Page(perPage: 10) {
    media(search: $s, type: ANIME) {
      title { english romaji native }
      synonyms
      startDate { year }
      seasonYear
      format
      coverImage { large extraLarge }
      popularity
    }
  }
}`;

// 採用に必要な題名の近さ（曲と同じ）
export const ANIME_MATCH_THRESHOLD = 0.72;

// 検索用：括弧書き（期数など）・-副題-・日本語題の後ろの英語副題を落とす
export function stripAnimeTitle(title) {
  const t = normalizeText(title);
  const stripped = t
    .replace(/[([{（【「].*?[)\]}）】」]/g, " ")
    .replace(/\s*[-~〜～][^-~〜～]*[-~〜～]\s*$/, "")
    .replace(/^(.*[぀-ヿ㐀-鿿].*?)\s+[\x20-\x7e]+$/, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || t;
}

// 試す検索語（先頭から順に。同じ検索語は重ねない）
// AniList の検索は長い題名・英語副題付きの日本語題に弱く、候補が 0 件になりやすい
export function buildAnimeQueries(anime) {
  const terms = anime.title_jp
    ? [normalizeText(anime.title_jp), stripAnimeTitle(anime.title_jp), normalizeText(anime.title_en)]
    : [normalizeText(anime.title_en)];
  return [...new Set(terms.filter(Boolean))];
}

function mediaYear(m) {
  return m.startDate?.year ?? m.seasonYear ?? null;
}

// 年の条件：完全一致は 1 年差まで（放送年と制作年の差）、部分一致は同じ年だけ（続く年の続編を避ける）。
// どちらかの年が分からなければ完全一致だけ
function yearAccepts(score, diff) {
  if (diff === null) return score === 1;
  return score === 1 ? diff <= 1 : diff === 0;
}

// 順位を先頭の要素から比べる
function isBetter(a, b) {
  const i = a.findIndex((v, idx) => v !== b[idx]);
  return i !== -1 && a[i] > b[i];
}

// AniList の検索結果から最も確からしい1件を選ぶ（弱い一致・年違いは null）
export function pickBestAnime(anime, results) {
  const keys = [anime.title_jp, anime.title_en].filter(Boolean).map(looseKey).filter(Boolean);
  let best = null;
  let bestRank = null;
  for (const m of results) {
    if (!m.coverImage?.large && !m.coverImage?.extraLarge) continue;
    const titles = [m.title?.native, m.title?.romaji, m.title?.english, ...(m.synonyms ?? [])].filter(Boolean);
    // 「三美姫（プリンセッセ）」のような読み仮名の括弧を落とした形でも比べる
    const cands = [...titles, ...titles.map((t) => t.replace(/[（(].*?[）)]/g, ""))].map(looseKey).filter(Boolean);
    const score = Math.max(0, ...keys.flatMap((k) => cands.map((c) => compareKeys(k, c))));
    if (score < ANIME_MATCH_THRESHOLD) continue;
    const year = mediaYear(m);
    const diff = anime.release_year && year ? Math.abs(anime.release_year - year) : null;
    if (!yearAccepts(score, diff)) continue;
    // 題名が近い順 → 年が近い順 → 人気順
    const rank = [score, -(diff ?? 0), m.popularity ?? 0];
    if (!bestRank || isBetter(rank, bestRank)) {
      best = m;
      bestRank = rank;
    }
  }
  return best;
}
