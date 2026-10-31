// 抽出したゲーム曲のゲーム作品を VNDB で検索し、結果を丸ごと保存する（ゲーム曲の代用画像の調査用）。
// VNDB はキー不要。上限は 5 分に 200 回なので 1.6 秒間隔で送る。DB は変更しない。
//
// 使い方: node tools/image-accuracy/fetch-vndb.mjs
// 結果: tools/image-accuracy/results/vndb-raw.jsonl（1 作品 1 行。途中で止めても続きから再開）

import fs from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const outPath = path.join(DIR, "results", "vndb-raw.jsonl");
const titles = [...new Set(
  JSON.parse(fs.readFileSync(path.join(DIR, "samples", "songs.json"), "utf8"))
    .filter((s) => s.category === "game" && s.game_title)
    .map((s) => s.game_title)
)];
const done = new Set(
  fs.existsSync(outPath)
    ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).title)
    : []
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const title of titles) {
  if (done.has(title)) continue;
  const res = await fetch("https://api.vndb.org/kana/vn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: ["search", "=", title],
      fields: "title,alttitle,titles.title,released,image.url,image.sexual,image.violence,image.dims",
      results: 5,
    }),
  });
  if (res.ok) {
    const data = await res.json();
    fs.appendFileSync(outPath, JSON.stringify({ title, results: data.results }) + "\n");
  } else {
    console.log(`失敗 ${res.status}: ${title}`);
    await sleep(30000);
  }
  await sleep(1600);
}
console.log(`VNDB: 完了 ${titles.length} 作品`);
