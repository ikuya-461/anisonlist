// アニメ作品の表紙の一括登録。画像の無い曲に作品の表紙を代わりに出すため、表紙の無い作品について AniList で探す。
// 判定はアプリと共通（animeMatch.js）。DB 接続は backend/.env と backend/certs/supabase-ca.pem を使う。
//
// 使い方:
//   node tools/image-accuracy/bulk-anime.mjs dry-run [件数=100]
//     DB は変えない。画像の無い曲を持つ作品を選んで探し、結果を bulk/anime-dryrun.jsonl に書く（止めても続きから）
//     終わると確認用の一覧 bulk/anime-dryrun.html を作る
//   caffeinate -i node tools/image-accuracy/bulk-anime.mjs apply [--limit 件数]
//     見つかった作品：image_url を書く（英題・ローマ字が空なら一緒に埋める。アプリの表示時キャッシュと同じ）
//     1 作品ごとに書き、bulk/anime-applied.jsonl に残す。止めても最後の作品の続きから再開する
//   AniList の失敗は 10 分おきに再試行し、約 1 時間続いたら止まる

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { findAnimeCover, createAniListSearch, RateLimitError } from "./lib/bulkCore.mjs";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(DIR, "../..");
const OUT = path.join(DIR, "bulk");
fs.mkdirSync(OUT, { recursive: true });

process.loadEnvFile(path.join(ROOT, "backend/.env"));
const { Pool } = createRequire(path.join(ROOT, "backend/package.json"))("pg");
const pool = new Pool({
  ssl: { rejectUnauthorized: true, ca: fs.readFileSync(path.join(ROOT, "backend/certs/supabase-ca.pem"), "utf8") },
  max: 1,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const search = createAniListSearch({ sleep });

// 対象：表紙が無く、画像の無いアニソンを持つ作品（代用の効果がある作品だけ）
const TARGET = `from anime an
  where an.image_url is null
    and exists (select 1 from songs s where s.anime_id = an.id and s.category = 'anime' and s.image_url is null)`;
const COLUMNS = `an.id, an.title_jp, an.title_en, an.title_romaji, an.release_year,
  (select count(*) from songs s where s.anime_id = an.id and s.image_url is null)::int as songs_without_image`;

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name) => { const i = args.indexOf(`--${name}`); return i === -1 ? null : args[i + 1]; };

let stopping = false;
process.on("SIGINT", () => { stopping = true; console.log("止めます（処理中の 1 作品を終えてから）"); });

const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

async function dryRun(count) {
  const outPath = path.join(OUT, "anime-dryrun.jsonl");
  const done = new Set(readJsonl(outPath).map((r) => r.id));
  const { rows } = await pool.query(`select ${COLUMNS} ${TARGET} order by md5(an.id::text) limit $1`, [count]);
  console.log(`試し実行: ${rows.length} 作品（保存済み ${rows.filter((r) => done.has(r.id)).length}）`);
  let n = 0;
  for (const anime of rows) {
    if (stopping) break;
    if (done.has(anime.id)) continue;
    const r = await findAnimeCover(anime, search);
    const hit = r.hit && {
      native: r.hit.title?.native, romaji: r.hit.title?.romaji, english: r.hit.title?.english,
      year: r.hit.startDate?.year ?? r.hit.seasonYear ?? null, format: r.hit.format,
    };
    fs.appendFileSync(outPath, JSON.stringify({ id: anime.id, item: anime, cover: r.cover, hit, queriesUsed: r.queriesUsed }) + "\n");
    if (++n % 25 === 0) console.log(`試し実行: ${done.size + n}/${rows.length}`);
  }
  console.log(`試し実行: 完了 ${done.size + n}/${rows.length}`);
  writeReport(readJsonl(outPath));
}

function writeReport(results) {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const found = results.filter((r) => r.cover);
  const songs = found.reduce((sum, r) => sum + r.item.songs_without_image, 0);
  const figs = found.map((r) => `<figure><img src="${esc(r.cover)}" loading="lazy" alt="">
    <figcaption><b>${esc(r.item.title_jp)}</b>（${esc(r.item.release_year)}）
    <br><small>AniList：${esc(r.hit.native)} / ${esc(r.hit.romaji)}（${esc(r.hit.year)}・${esc(r.hit.format)}）
    <br>id ${r.id}・画像の無い曲 ${r.item.songs_without_image}</small></figcaption></figure>`).join("");
  const missing = results.filter((r) => !r.cover)
    .map((r) => `<li>${esc(r.item.title_jp)}（${esc(r.item.release_year)}）</li>`).join("");
  fs.writeFileSync(path.join(OUT, "anime-dryrun.html"), `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>作品表紙の試し実行</title>
<style>
:root { --bg:#fff; --fg:#1a1a1a; --muted:#666; --line:#ddd; }
@media (prefers-color-scheme: dark) { :root { --bg:#141414; --fg:#eee; --muted:#aaa; --line:#333; } }
body { background:var(--bg); color:var(--fg); font-family:system-ui,"Hiragino Sans",sans-serif; margin:0 auto; padding:16px; max-width:1200px; }
small, p, li { color:var(--muted); }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; margin-bottom:32px; }
figure { margin:0; border:1px solid var(--line); border-radius:6px; padding:6px; font-size:13px; }
img { width:100%; aspect-ratio:2/3; object-fit:cover; border-radius:4px; display:block; }
</style></head><body>
<h1>アニメ作品の表紙：試し実行</h1>
<p>DB は変えていない。${results.length} 作品中 ${found.length} 作品に表紙が見つかった（画像の無い曲 ${songs} 曲分）。</p>
<div class="grid">${figs}</div>
<h2>見つからなかった作品（${results.length - found.length}）</h2><ul>${missing}</ul>
</body></html>`);
  console.log(`一覧: ${path.join(OUT, "anime-dryrun.html")}（${results.length} 作品中 ${found.length} 作品・曲 ${songs} 曲分）`);
}

async function apply(limit) {
  const logPath = path.join(OUT, "anime-applied.jsonl");
  let lastId = Math.max(0, ...readJsonl(logPath).map((r) => r.id));
  const started = Date.now();
  let n = 0;
  let found = 0;
  while (!stopping && n < limit) {
    const { rows } = await pool.query(`select ${COLUMNS} ${TARGET} and an.id > $1 order by an.id limit 200`, [lastId]);
    if (rows.length === 0) break;
    for (const anime of rows) {
      if (stopping || n >= limit) break;
      lastId = anime.id;
      const r = await findAnimeCover(anime, search);
      // 表紙が無いままの作品だけを書く（処理中にアプリが表紙を保存した作品は上書きしない）
      const res = r.cover
        ? await pool.query(
            `update anime set image_url = $2, title_en = coalesce(title_en, $3), title_romaji = coalesce(title_romaji, $4)
             where id = $1 and image_url is null`, [anime.id, r.cover, r.title_en, r.title_romaji])
        : { rowCount: 0 };
      fs.appendFileSync(logPath, JSON.stringify({ id: anime.id, cover: r.cover, updated: res.rowCount, at: new Date().toISOString() }) + "\n");
      n++;
      if (r.cover) found++;
      if (n % 100 === 0) {
        const perItem = (Date.now() - started) / n;
        console.log(`${new Date().toLocaleString("ja-JP")} 処理 ${n} 作品・付いた ${found}（${((found / n) * 100).toFixed(1)}%）・1 作品あたり ${(perItem / 1000).toFixed(1)} 秒`);
      }
    }
  }
  console.log(`完了: 処理 ${n} 作品・付いた ${found}・最後の id ${lastId}`);
}

try {
  if (mode === "dry-run") await dryRun(Number(args[1] ?? 100));
  else if (mode === "apply") await apply(Number(opt("limit") ?? Infinity));
  else console.log("使い方: node tools/image-accuracy/bulk-anime.mjs dry-run [件数] | apply [--limit …]");
} catch (e) {
  if (e instanceof RateLimitError) console.log(`AniList の失敗が続いたので止めました。時間をおいて同じコマンドで再開できます: ${e.message}`);
  else throw e;
} finally {
  await pool.end();
}
