// M5：DB に保存済みの画像を、新しい判定（songMatch.js / animeMatch.js）で見直し、
// 「そのまま／差し替え候補／削除候補／確認できない」に分ける。DB は変更しない（外部 API を読むだけ）。
//
// 使い方: node tools/image-accuracy/recheck.mjs <songs|anime>
//   入力: recheck/<kind>.json（画像を保存済みの行。DB から読み出したもの）
//   結果: recheck/result-<kind>.jsonl（1 件 1 行）
// 取得した応答は results/itunes-raw.jsonl・results/anilist-raw.jsonl に足していくので、止めても続きから再開できる

import fs from "node:fs";
import path from "node:path";
import { buildSongQueries, itunesSearchUrl, pickBestSong } from "../../frontend/src/lib/imageCache/songMatch.js";
import { buildAnimeQueries, pickBestAnime, ANILIST_MEDIA_QUERY } from "../../frontend/src/lib/imageCache/animeMatch.js";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const kind = process.argv[2] ?? "songs";
const items = JSON.parse(fs.readFileSync(path.join(DIR, "recheck", `${kind}.json`), "utf8"));
const outPath = path.join(DIR, "recheck", `result-${kind}.jsonl`);
const rawPath = path.join(DIR, "results", kind === "songs" ? "itunes-raw.jsonl" : "anilist-raw.jsonl");
const keyOf = (r) => (kind === "songs" ? r.url : r.term);

const raw = new Map(
  fs.existsSync(rawPath)
    ? fs.readFileSync(rawPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => [keyOf(r), r.results])
    : []
);
const done = new Set(
  fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []
);

// iTunes は 1 分に約 20 回、AniList は 30〜90 回が目安。余裕を見て間隔を空ける
const INTERVAL_MS = kind === "songs" ? 3200 : 2200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchItunes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r) => ({
    trackId: r.trackId, trackName: r.trackName, artistName: r.artistName,
    collectionName: r.collectionName, artworkUrl100: r.artworkUrl100,
  }));
}

async function fetchAniList(term) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_MEDIA_QUERY, variables: { s: term } }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const data = await res.json();
  return data?.data?.Page?.media ?? [];
}

// 保存済みならそれを使い、無ければ取得して保存する
async function search(key) {
  if (raw.has(key)) return raw.get(key);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const results = kind === "songs" ? await fetchItunes(key) : await fetchAniList(key);
      raw.set(key, results);
      fs.appendFileSync(rawPath, JSON.stringify(kind === "songs" ? { url: key, results } : { term: key, results }) + "\n");
      await sleep(INTERVAL_MS);
      return results;
    } catch (e) {
      console.log(`再試行 ${attempt + 1}: ${e.message}`);
      await sleep((kind === "songs" ? 30000 : 60000) * (attempt + 1));
    }
  }
  return null; // 3 回失敗：この件は「取得失敗」として残し、次回の実行で再試行する
}

// 画像の同一性：iTunes はホスト（is1〜is5）とサイズを除いたパス、AniList はファイル名で比べる
const songImageKey = (url) => url && new URL(url).pathname.replace(/\/\d+x\d+bb\.(jpg|png)$/, "");
const animeImageKey = (url) => url && url.split("/").pop();

const songArtwork = (r) => r.artworkUrl100.replace("100x100", "600x600");
const animeCover = (m) => m.coverImage.extraLarge || m.coverImage.large;

async function recheck(item) {
  const queries = kind === "songs"
    ? buildSongQueries(item).map((q) => itunesSearchUrl(q.term, q.limit))
    : buildAnimeQueries(item);
  const pick = kind === "songs" ? pickBestSong : pickBestAnime;
  const imageOf = kind === "songs" ? songArtwork : animeCover;
  const imageKey = kind === "songs" ? songImageKey : animeImageKey;
  const hasImage = (r) => (kind === "songs" ? !!r.artworkUrl100 : !!(r.coverImage?.large || r.coverImage?.extraLarge));

  const currentKey = imageKey(item.image_url);
  let best = null;
  let current = null; // 今の画像を出した候補
  for (const key of queries) {
    const results = await search(key);
    if (results === null) return { status: "fetch_error" };
    current ??= results.find((r) => hasImage(r) && imageKey(imageOf(r)) === currentKey) ?? null;
    best ??= pick(item, results);
    if (best && current) break;
  }

  const view = (r) => r && (kind === "songs"
    ? { image: songArtwork(r), trackName: r.trackName, artistName: r.artistName, collectionName: r.collectionName }
    : { image: animeCover(r), native: r.title?.native, romaji: r.title?.romaji, year: r.startDate?.year ?? r.seasonYear, format: r.format });

  let status;
  if (current && pick(item, [current])) status = "keep";          // 今の画像は新しい判定でも通る
  else if (current) status = best ? "replace" : "delete";          // 今の画像は新しい判定で落ちる
  else status = best ? "unknown_new" : "unknown_none";             // 今の画像の出どころが検索結果に無い
  if (status === "unknown_new" && imageKey(imageOf(best)) === currentKey) status = "keep";
  return { status, current: view(current), best: view(best) };
}

let n = 0;
for (const item of items) {
  if (done.has(item.id)) continue;
  const result = await recheck(item);
  if (result.status === "fetch_error") { console.log(`取得失敗（次回再試行）: ${item.id}`); continue; }
  fs.appendFileSync(outPath, JSON.stringify({ id: item.id, item, ...result }) + "\n");
  n++;
  if (n % 50 === 0) console.log(`${kind}: ${done.size + n}/${items.length}`);
}
console.log(`${kind}: 完了 ${done.size + n}/${items.length}`);
