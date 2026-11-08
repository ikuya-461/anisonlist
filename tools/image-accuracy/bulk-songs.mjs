// 曲画像の一括登録（PRD M6）。画像が無く、まだ探していない曲について iTunes でジャケットを探す。
// 判定はアプリと共通（songMatch.js）。DB 接続は backend/.env と backend/certs/supabase-ca.pem を使う。
//
// 使い方:
//   node tools/image-accuracy/bulk-songs.mjs dry-run [カテゴリごとの件数=100]
//     DB は変えない。カテゴリごとに曲を選んで探し、結果を bulk/dryrun.jsonl に書く（止めても続きから）
//   caffeinate -i node tools/image-accuracy/bulk-songs.mjs apply [--category anime,game,Vtuber] [--limit 件数]
//     見つかった曲：image_url・image_source='batch'・image_checked_at を書く
//     見つからなかった曲：image_checked_at だけ書く（次回から探し直さない）
//     1 曲ごとに書くので、止めても続きから再開できる。書いた内容は bulk/applied.jsonl にも残す
//   iTunes の失敗（回数制限・404・通信エラー）は 10 分おきに再試行し、約 1 時間続いたら止まる（IP のブロックを避けるため）

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { findArtwork, createItunesSearch, RateLimitError, MAX_QUERIES } from "./lib/bulkCore.mjs";

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
const search = createItunesSearch({ sleep });

// 対象は測定で誤り 0% を確かめた 3 カテゴリ（ボカロは未測定のため対象外）
const CATEGORIES = ["anime", "game", "Vtuber"];

// 歌手名は抜き取りサンプルと同じ作り方（歌手が無ければボーカルを連結）
const SONG_COLUMNS = `s.id, s.category, s.song_title,
  coalesce(a.name, (select string_agg(ar.name, ', ' order by ar.name)
    from song_artists sa join artists ar on ar.id = sa.artist_id
    where sa.song_id = s.id and sa.role = 'vocalist')) as artist`;

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name) => { const i = args.indexOf(`--${name}`); return i === -1 ? null : args[i + 1]; };

let stopping = false;
process.on("SIGINT", () => { stopping = true; console.log("止めます（処理中の 1 曲を終えてから）"); });

async function dryRun(perCategory) {
  const outPath = path.join(OUT, "dryrun.jsonl");
  const done = new Set(
    fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []
  );
  // 抜き取りサンプル（M1）とは別の曲を、毎回同じ順で選ぶ
  const { rows } = await pool.query(
    `select * from (
       select ${SONG_COLUMNS}, row_number() over (partition by s.category order by md5(s.id::text)) as rn
       from songs s left join artists a on a.id = s.artist_id
       where s.category = any($1) and s.image_url is null and s.image_checked_at is null
     ) x where rn <= $2 order by category, rn`,
    [CATEGORIES, perCategory]
  );
  console.log(`試し実行: ${rows.length} 曲（保存済み ${rows.filter((r) => done.has(r.id)).length}）`);
  let n = 0;
  for (const song of rows) {
    if (stopping) break;
    if (done.has(song.id)) continue;
    const r = song.artist ? await findArtwork(song, search) : { hit: null, image: null, queriesUsed: 0 };
    const hit = r.hit && { trackName: r.hit.trackName, artistName: r.hit.artistName, collectionName: r.hit.collectionName };
    fs.appendFileSync(outPath, JSON.stringify({ id: song.id, item: song, image: r.image, hit, queriesUsed: r.queriesUsed }) + "\n");
    if (++n % 50 === 0) console.log(`試し実行: ${done.size + n}/${rows.length}`);
  }
  console.log(`試し実行: 完了 ${done.size + n}/${rows.length}`);
}

async function apply(categories, limit) {
  const logPath = path.join(OUT, "applied.jsonl");
  const started = Date.now();
  let lastId = 0;
  let n = 0;
  let found = 0;
  let queries = 0;
  while (!stopping && n < limit) {
    const { rows } = await pool.query(
      `select ${SONG_COLUMNS} from songs s left join artists a on a.id = s.artist_id
       where s.category = any($1) and s.image_url is null and s.image_checked_at is null and s.id > $2
       order by s.id limit 200`,
      [categories, lastId]
    );
    if (rows.length === 0) break;
    for (const song of rows) {
      if (stopping || n >= limit) break;
      lastId = song.id;
      const r = song.artist ? await findArtwork(song, search) : { image: null, queriesUsed: 0 };
      queries += r.queriesUsed;
      // 画像が無いままの行だけを書く（処理中にアプリが画像を保存した曲は上書きしない）
      const res = r.image
        ? await pool.query(
            `update songs set image_url = $2, image_source = 'batch', image_checked_at = now()
             where id = $1 and image_url is null`, [song.id, r.image])
        : await pool.query(`update songs set image_checked_at = now() where id = $1 and image_url is null`, [song.id]);
      fs.appendFileSync(logPath, JSON.stringify({ id: song.id, image: r.image, updated: res.rowCount, at: new Date().toISOString() }) + "\n");
      n++;
      if (r.image) found++;
      if (n % 100 === 0) {
        const perSong = (Date.now() - started) / n;
        console.log(`${new Date().toLocaleString("ja-JP")} 処理 ${n} 曲・付いた ${found}（${((found / n) * 100).toFixed(1)}%）・検索 ${queries} 回・1 曲あたり ${(perSong / 1000).toFixed(1)} 秒`);
      }
    }
  }
  console.log(`完了: 処理 ${n} 曲・付いた ${found}・検索 ${queries} 回・最後の id ${lastId}`);
}

try {
  if (mode === "dry-run") await dryRun(Number(args[1] ?? 100));
  else if (mode === "apply") await apply((opt("category") ?? CATEGORIES.join(",")).split(","), Number(opt("limit") ?? Infinity));
  else console.log("使い方: node tools/image-accuracy/bulk-songs.mjs dry-run [件数] | apply [--category …] [--limit …]");
} catch (e) {
  if (e instanceof RateLimitError) console.log(`iTunes の回数制限で止めました。時間をおいて同じコマンドで再開できます: ${e.message}`);
  else throw e;
} finally {
  await pool.end();
}
console.log(`（1 曲の検索は最大 ${MAX_QUERIES} 回）`);
