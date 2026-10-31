// 抽出した曲について、判定の改善で使う検索語ごとに iTunes の検索結果を丸ごと保存する。
// 保存した結果を使えば、判定ロジックを変えるたびに iTunes へ問い合わせ直さずに済む。DB は変更しない。
//
// 使い方: node tools/image-accuracy/fetch-itunes.mjs <category>   （anime / Vtuber / game）
// 結果: tools/image-accuracy/results/itunes-raw.jsonl（1 検索 1 行。途中で止めても続きから再開）

import fs from "node:fs";
import path from "node:path";
import { buildSongQueries, itunesSearchUrl } from "../../frontend/src/lib/imageCache/songMatch.js";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const category = process.argv[2] ?? "anime";
const samples = JSON.parse(fs.readFileSync(path.join(DIR, "samples", "songs.json"), "utf8")).filter(
  (s) => s.category === category
);
const outPath = path.join(DIR, "results", "itunes-raw.jsonl");

const done = new Set(
  fs.existsSync(outPath)
    ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).url)
    : []
);

// iTunes は 1 分に約 20 回が目安。余裕を見て間隔を空ける
const INTERVAL_MS = 3200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const urls = [...new Set(samples.flatMap((s) => buildSongQueries(s).map((q) => itunesSearchUrl(q.term, q.limit))))];
console.log(`${category}: 検索 ${urls.length} 件（保存済み ${urls.filter((u) => done.has(u)).length}）`);

let n = 0;
for (const url of urls) {
  if (done.has(url)) continue;
  let line;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`iTunes ${res.status}`);
      const data = await res.json();
      const results = (data.results ?? []).map((r) => ({
        trackId: r.trackId, trackName: r.trackName, artistName: r.artistName,
        collectionName: r.collectionName, artworkUrl100: r.artworkUrl100,
      }));
      line = { url, results };
      break;
    } catch (e) {
      // 回数制限・一時エラーは待ってから再試行。3 回失敗したら保存せず次回に回す
      console.log(`再試行 ${attempt + 1}: ${e.message}`);
      await sleep(30000 * (attempt + 1));
    }
  }
  if (line) fs.appendFileSync(outPath, JSON.stringify(line) + "\n");
  n++;
  if (n % 50 === 0) console.log(`${category}: ${n} 件取得`);
  await sleep(INTERVAL_MS);
}
console.log(`${category}: 完了（今回 ${n} 件）`);
