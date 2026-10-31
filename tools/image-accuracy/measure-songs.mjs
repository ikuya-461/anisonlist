// 改善後の判定（frontend/src/lib/imageCache/songMatch.js）で、抽出した曲に画像が付くかを測る。
// iTunes へは問い合わせず、fetch-itunes.mjs が保存した検索結果だけを使う。DB は変更しない。
//
// 使い方: node tools/image-accuracy/measure-songs.mjs <label> <category> [検索語の数]
//   例: node tools/image-accuracy/measure-songs.mjs v2 anime      （検索語を全部試す）
//       node tools/image-accuracy/measure-songs.mjs v2q2 anime 2  （先頭 2 つまで）
// 結果: tools/image-accuracy/results/<label>-songs.jsonl（measure-current.mjs と同じ形式。analyze.py で集計）

import fs from "node:fs";
import path from "node:path";
import {
  buildSongQueries, itunesSearchUrl, pickBestSong, normForMatch, artistMatches,
} from "../../frontend/src/lib/imageCache/songMatch.js";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const [label = "v2", category = "anime", maxQueries = "99"] = process.argv.slice(2);

const raw = new Map(
  fs.readFileSync(path.join(DIR, "results", "itunes-raw.jsonl"), "utf8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.url, r.results])
);
const samples = JSON.parse(fs.readFileSync(path.join(DIR, "samples", "songs.json"), "utf8")).filter(
  (s) => s.category === category
);

const view = (r, queryIndex) => r && ({
  trackName: r.trackName, artistName: r.artistName, collectionName: r.collectionName,
  artwork: r.artworkUrl100.replace("100x100", "600x600"), queryIndex,
});

const lines = [];
let missing = 0;
for (const item of samples) {
  const queries = buildSongQueries(item).slice(0, Number(maxQueries));
  let adopted = null;
  let candidates = 0;
  let last = [];
  for (const [i, q] of queries.entries()) {
    const results = raw.get(itunesSearchUrl(q.term, q.limit));
    if (!results) { missing++; continue; }
    candidates += results.length;
    last = results;
    const hit = pickBestSong(item, results);
    if (hit) { adopted = view(hit, i); break; }
  }
  // 付かなかったときの手がかりとして、最後の検索の上位 3 件を残す
  const qt = normForMatch(item.song_title);
  const top = adopted ? [] : last.slice(0, 3).map((r) => ({
    ...view(r, -1), sameTitle: normForMatch(r.trackName) === qt, artistMatch: artistMatches(item.artist, r.artistName),
  }));
  lines.push(JSON.stringify({ id: item.id, item, candidates, adopted, top }));
}

fs.writeFileSync(path.join(DIR, "results", `${label}-songs.jsonl`), lines.join("\n") + "\n");
console.log(`${label}/${category}: ${samples.length} 件（付いた ${lines.filter((l) => JSON.parse(l).adopted).length}、未取得の検索 ${missing}）`);
