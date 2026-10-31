// 改善後の判定（frontend/src/lib/imageCache/animeMatch.js）で、抽出したアニメ作品に画像が付くかを測る。
// AniList へは問い合わせず、fetch-anilist.mjs が保存した検索結果だけを使う。DB は変更しない。
//
// 使い方: node tools/image-accuracy/measure-anime.mjs <label> [検索語の数] [年を渡さない: noyear]
//   例: node tools/image-accuracy/measure-anime.mjs a2            （検索語を全部試す）
//       node tools/image-accuracy/measure-anime.mjs a2q1 1        （先頭 1 つまで）
//       node tools/image-accuracy/measure-anime.mjs a2ny 99 noyear（発売年が分からない画面を想定）
// 結果: tools/image-accuracy/results/<label>-anime.jsonl（measure-current.mjs と同じ形式。analyze.py で集計）

import fs from "node:fs";
import path from "node:path";
import { buildAnimeQueries, pickBestAnime } from "../../frontend/src/lib/imageCache/animeMatch.js";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const [label = "a2", maxQueries = "99", yearMode = ""] = process.argv.slice(2);

const raw = new Map(
  fs.readFileSync(path.join(DIR, "results", "anilist-raw.jsonl"), "utf8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.term, r.results])
);
const samples = JSON.parse(fs.readFileSync(path.join(DIR, "samples", "anime.json"), "utf8"));

const view = (m, queryIndex) => m && ({
  native: m.title?.native, romaji: m.title?.romaji, english: m.title?.english,
  seasonYear: m.startDate?.year ?? m.seasonYear, format: m.format, popularity: m.popularity,
  cover: m.coverImage.extraLarge || m.coverImage.large, queryIndex,
});

const lines = [];
let missing = 0;
for (const item of samples) {
  const anime = yearMode === "noyear" ? { ...item, release_year: null } : item;
  let adopted = null;
  let candidates = 0;
  let last = [];
  for (const [i, term] of buildAnimeQueries(anime).slice(0, Number(maxQueries)).entries()) {
    const results = raw.get(term);
    if (!results) { missing++; continue; }
    candidates += results.length;
    last = results;
    const hit = pickBestAnime(anime, results);
    if (hit) { adopted = view(hit, i); break; }
  }
  // 付かなかったときの手がかりとして、最後の検索の上位 3 件を残す
  const top = adopted ? [] : last.slice(0, 3).map((m) => view(m, -1));
  lines.push(JSON.stringify({ id: item.id, item, candidates, adopted, top }));
}

fs.writeFileSync(path.join(DIR, "results", `${label}-anime.jsonl`), lines.join("\n") + "\n");
console.log(`${label}: ${samples.length} 件（付いた ${lines.filter((l) => JSON.parse(l).adopted).length}、未取得の検索 ${missing}）`);
