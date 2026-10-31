// 現状の画像判定（2026-10-30 時点のアプリと同じロジック）で、抽出した曲・アニメに
// 画像が付くかを測る。DB は変更しない。外部 API（iTunes / AniList）を読むだけ。
//
// 使い方: node tools/image-accuracy/measure-current.mjs [songs|anime]
// 結果: tools/image-accuracy/results/current-<kind>.jsonl（1 件 1 行。途中で止めても続きから再開）
//
// 判定ロジックは frontend/src/lib/imageCache/{songImageCache,animeImageCache,normalize}.js
// から写したもの（測定のため。共通化は PRD の F9 で行う）

import fs from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const kind = process.argv[2] ?? "songs";
const samples = JSON.parse(fs.readFileSync(path.join(DIR, "samples", `${kind}.json`), "utf8"));
const outPath = path.join(DIR, "results", `current-${kind}.jsonl`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const done = new Set(
  fs.existsSync(outPath)
    ? fs.readFileSync(outPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id)
    : []
);

// iTunes は 1 分に約 20 回が目安、AniList は 90 回/分。余裕を見て間隔を空ける
const INTERVAL_MS = kind === "songs" ? 3200 : 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- ここからアプリと同じ判定 ---------- */
const MATCH_THRESHOLD = 0.72;

function normalizeText(str) {
  if (!str) return "";
  return str.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function normForMatch(str) {
  return normalizeText(str)
    .replace(/[([{（【「].*?[)\]}）】」]/g, "")
    .replace(/\s*[-–—]\s.*$/, "")
    .replace(/(?:feat|ft)\.?.*$/i, "")
    .replace(/[!！?？。、,.\-_/~〜・:：'"’”]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const big = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const A = big(a);
  const B = big(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function scoreSong(queryTitle, queryArtist, r) {
  const qt = normForMatch(queryTitle);
  const qa = normalizeText(queryArtist);
  const rt = normForMatch(r.trackName || "");
  let titleScore;
  if (rt && rt === qt) titleScore = 1;
  else if (qt && rt && (rt.includes(qt) || qt.includes(rt))) titleScore = 0.85;
  else titleScore = similarity(qt, rt);
  const ra = normalizeText(r.artistName || "");
  const artistMatch = !!(qa && ra && (ra.includes(qa) || qa.includes(ra)));
  return { score: titleScore + (artistMatch ? 0.18 : 0), titleScore, artistMatch };
}

function scoreAnime(queryTitle, r) {
  const qt = normalizeText(queryTitle);
  const candidates = [r.title?.native, r.title?.romaji, r.title?.english].filter(Boolean).map(normalizeText);
  let score = 0;
  for (const c of candidates) {
    if (c === qt) { score = 1; break; }
    if (c.includes(qt) || qt.includes(c)) score = Math.max(score, 0.85);
    else score = Math.max(score, similarity(qt, c));
  }
  return score;
}
/* ---------- ここまで ---------- */

async function measureSong(s) {
  const title = normalizeText(s.song_title);
  const artist = normalizeText(s.artist).split(",")[0].trim();
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&country=JP&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const data = await res.json();
  const cands = (data.results ?? [])
    .filter((r) => r.artworkUrl100)
    .map((r) => ({
      trackName: r.trackName, artistName: r.artistName, collectionName: r.collectionName,
      artwork: r.artworkUrl100.replace("100x100", "600x600"), ...scoreSong(s.song_title, artist, r),
    }));
  let best = null;
  for (const c of cands) if (!best || c.score > best.score) best = c;
  const adopted = best && best.score >= MATCH_THRESHOLD ? best : null;
  return { candidates: cands.length, adopted, top: cands.sort((a, b) => b.score - a.score).slice(0, 3) };
}

const ANILIST_QUERY = `query ($s: String) { Page(perPage: 5) { media(search: $s, type: ANIME) {
  title { english romaji native } coverImage { large extraLarge } popularity seasonYear format } } }`;

async function measureAnime(a) {
  const q = a.title_jp || a.title_en;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { s: q } }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const data = await res.json();
  const media = data?.data?.Page?.media ?? [];
  const cands = media
    .filter((r) => r.coverImage?.large || r.coverImage?.extraLarge)
    .map((r) => ({
      native: r.title?.native, romaji: r.title?.romaji, english: r.title?.english,
      seasonYear: r.seasonYear, format: r.format, popularity: r.popularity ?? 0,
      cover: r.coverImage.extraLarge || r.coverImage.large, score: scoreAnime(q, r),
    }));
  let best = null;
  for (const c of cands) {
    if (!best || c.score > best.score || (c.score === best.score && c.popularity > best.popularity)) best = c;
  }
  const adopted = best && best.score >= MATCH_THRESHOLD ? best : null;
  return { candidates: cands.length, adopted, top: cands.sort((x, y) => y.score - x.score).slice(0, 3) };
}

let n = 0;
for (const item of samples) {
  if (done.has(item.id)) continue;
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = kind === "songs" ? await measureSong(item) : await measureAnime(item);
      break;
    } catch (e) {
      // 回数制限・一時エラーは待ってから再試行
      result = { error: String(e.message) };
      await sleep(30000 * (attempt + 1));
    }
  }
  fs.appendFileSync(outPath, JSON.stringify({ id: item.id, item, ...result }) + "\n");
  n++;
  if (n % 25 === 0) console.log(`${kind}: ${done.size + n}/${samples.length}`);
  await sleep(INTERVAL_MS);
}
console.log(`${kind}: 完了 ${done.size + n}/${samples.length}`);
