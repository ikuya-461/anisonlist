// 抽出したアニメ作品について、判定の改善で使う検索語ごとに AniList の検索結果を丸ごと保存する。
// 保存した結果を使えば、判定ロジックを変えるたびに AniList へ問い合わせ直さずに済む。DB は変更しない。
//
// 使い方: node tools/image-accuracy/fetch-anilist.mjs
// 結果: tools/image-accuracy/results/anilist-raw.jsonl（1 検索 1 行。途中で止めても続きから再開）

import fs from "node:fs";
import path from "node:path";
import { buildAnimeQueries, ANILIST_MEDIA_QUERY } from "../../frontend/src/lib/imageCache/animeMatch.js";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const samples = JSON.parse(fs.readFileSync(path.join(DIR, "samples", "anime.json"), "utf8"));
const outPath = path.join(DIR, "results", "anilist-raw.jsonl");
const done = new Set(
  fs.existsSync(outPath)
    ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).term)
    : []
);

// AniList は 1 分 90 回（混雑時は 30 回）が上限。余裕を見て間隔を空ける
const INTERVAL_MS = 2200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const terms = [...new Set(samples.flatMap((a) => buildAnimeQueries(a)))];
console.log(`AniList: 検索 ${terms.length} 件（保存済み ${terms.filter((t) => done.has(t)).length}）`);

let n = 0;
for (const term of terms) {
  if (done.has(term)) continue;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: ANILIST_MEDIA_QUERY, variables: { s: term } }),
      });
      if (!res.ok) throw new Error(`AniList ${res.status}`);
      const data = await res.json();
      fs.appendFileSync(outPath, JSON.stringify({ term, results: data?.data?.Page?.media ?? [] }) + "\n");
      break;
    } catch (e) {
      // 回数制限・一時エラーは待ってから再試行。3 回失敗したら保存せず次回に回す
      console.log(`再試行 ${attempt + 1}: ${e.message}`);
      await sleep(60000 * (attempt + 1));
    }
  }
  n++;
  if (n % 100 === 0) console.log(`AniList: ${n} 件取得`);
  await sleep(INTERVAL_MS);
}
console.log(`AniList: 完了（今回 ${n} 件）`);
