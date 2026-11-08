// 曲画像の一括登録（PRD M6）の中核：iTunes への問い合わせと、1 曲分の判定。
// 判定そのものはアプリと共通の songMatch.js を使う。DB には触らない（呼び出し側で書く）。

import { buildSongQueries, itunesSearchUrl, pickBestSong } from "../../../frontend/src/lib/imageCache/songMatch.js";

// 1 曲に送る検索の上限。3 回目（曲名だけ）は抜き取りで 300 曲に 1 曲しか増えなかったため使わない
export const MAX_QUERIES = 2;

// iTunes の回数制限が続いたときに一括登録全体を止めるための例外（IP がブロックされるのを避ける）
export class RateLimitError extends Error {}

// 問い合わせの間隔を空け、回数制限（403・429）や一時エラー（404・通信エラー）は 10 分待って再試行する。
// 約 1 時間（maxAttempts 回）失敗が続いたときだけ止める。数時間無人で回すため、一時的な不調では止めない。
// 同じ URL の結果は覚えておき、2 回問い合わせない（OP/ED 違いなど同じ曲名・歌手の曲が多いため）
export function createItunesSearch({ fetchFn = fetch, sleep, intervalMs = 3200, retryWaitMs = 600000, maxAttempts = 7, cacheSize = 5000 }) {
  const cache = new Map();
  return async function search(url) {
    if (cache.has(url)) return cache.get(url);
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let res;
      try {
        res = await fetchFn(url);
      } catch (e) {
        lastError = e;
      }
      await sleep(intervalMs);
      if (res?.ok) {
        const data = await res.json();
        const results = data.results ?? [];
        if (cache.size >= cacheSize) cache.delete(cache.keys().next().value);
        cache.set(url, results);
        return results;
      }
      if (res) lastError = new Error(`iTunes ${res.status}`);
      if (attempt < maxAttempts - 1) {
        console.log(`${new Date().toLocaleString("ja-JP")} iTunes への問い合わせに失敗（${lastError?.message}）。${retryWaitMs / 60000} 分待って再試行（${attempt + 1}/${maxAttempts}）`);
        await sleep(retryWaitMs);
      }
    }
    throw new RateLimitError(`iTunes への問い合わせが ${maxAttempts} 回続けて失敗した: ${lastError?.message}`);
  };
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
