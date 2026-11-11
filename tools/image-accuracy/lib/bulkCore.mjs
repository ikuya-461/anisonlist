// 画像の一括登録（PRD M6）の中核：iTunes・AniList への問い合わせと、1 件分の判定。
// 判定そのものはアプリと共通の songMatch.js・animeMatch.js を使う。DB には触らない（呼び出し側で書く）。

import { buildSongQueries, itunesSearchUrl, pickBestSong } from "../../../frontend/src/lib/imageCache/songMatch.js";
import { buildAnimeQueries, pickBestAnime, ANILIST_MEDIA_QUERY } from "../../../frontend/src/lib/imageCache/animeMatch.js";

// 1 曲に送る検索の上限。3 回目（曲名だけ）は抜き取りで 300 曲に 1 曲しか増えなかったため使わない
export const MAX_QUERIES = 2;

const ANILIST_API = "https://graphql.anilist.co";

// 回数制限が続いたときに一括登録全体を止めるための例外（IP がブロックされるのを避ける）
export class RateLimitError extends Error {}

// 問い合わせの間隔を空け、回数制限（403・429）や一時エラー（404・通信エラー）は 10 分待って再試行する。
// 約 1 時間（maxAttempts 回）失敗が続いたときだけ止める。数時間無人で回すため、一時的な不調では止めない。
// 同じ検索の結果は覚えておき、2 回問い合わせない（OP/ED 違いなど同じ曲名・歌手の曲が多いため）
function createRetryingSearch(name, request, pickResults,
  { fetchFn = fetch, sleep, intervalMs, retryWaitMs = 600000, maxAttempts = 7, cacheSize = 5000 }) {
  const cache = new Map();
  return async function search(key) {
    if (cache.has(key)) return cache.get(key);
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let res;
      try {
        res = await request(fetchFn, key);
      } catch (e) {
        lastError = e;
      }
      await sleep(intervalMs);
      if (res?.ok) {
        const results = pickResults(await res.json());
        if (cache.size >= cacheSize) cache.delete(cache.keys().next().value);
        cache.set(key, results);
        return results;
      }
      if (res) lastError = new Error(`${name} ${res.status}`);
      if (attempt < maxAttempts - 1) {
        console.log(`${new Date().toLocaleString("ja-JP")} ${name} への問い合わせに失敗（${lastError?.message}）。${retryWaitMs / 60000} 分待って再試行（${attempt + 1}/${maxAttempts}）`);
        await sleep(retryWaitMs);
      }
    }
    throw new RateLimitError(`${name} への問い合わせが ${maxAttempts} 回続けて失敗した: ${lastError?.message}`);
  };
}

// iTunes は 1 分 20 回程度が目安のため 3.2 秒間隔
export function createItunesSearch({ intervalMs = 3200, ...opts }) {
  return createRetryingSearch("iTunes", (fetchFn, url) => fetchFn(url), (data) => data.results ?? [], { intervalMs, ...opts });
}

// AniList は 1 分 90 回（混雑時は 30 回）が上限のため 2.2 秒間隔
export function createAniListSearch({ intervalMs = 2200, ...opts }) {
  const request = (fetchFn, term) => fetchFn(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_MEDIA_QUERY, variables: { s: term } }),
  });
  return createRetryingSearch("AniList", request, (data) => data?.data?.Page?.media ?? [], { intervalMs, ...opts });
}

// 1 曲分：検索語を順に試し、採用できる画像（600px）があれば返す
export async function findArtwork(song, search, maxQueries = MAX_QUERIES) {
  let queriesUsed = 0;
  for (const q of buildSongQueries(song).slice(0, maxQueries)) {
    const results = await search(itunesSearchUrl(q.term, q.limit));
    queriesUsed++;
    const hit = pickBestSong(song, results);
    if (hit) return { hit, image: hit.artworkUrl100.replace("100x100", "600x600"), queriesUsed };
  }
  return { hit: null, image: null, queriesUsed };
}

// 1 作品分：検索語（題名・副題を落とした題名・英題）を順に試し、採用できる表紙と英題・ローマ字を返す
export async function findAnimeCover(anime, search) {
  let queriesUsed = 0;
  for (const term of buildAnimeQueries(anime)) {
    const results = await search(term);
    queriesUsed++;
    const hit = pickBestAnime(anime, results);
    if (hit) {
      return {
        hit,
        cover: hit.coverImage?.extraLarge || hit.coverImage?.large,
        title_en: hit.title?.english || null,
        title_romaji: hit.title?.romaji || null,
        queriesUsed,
      };
    }
  }
  return { hit: null, cover: null, title_en: null, title_romaji: null, queriesUsed };
}
