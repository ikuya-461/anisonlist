// 実行: node --test tools/image-accuracy/lib/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { findArtwork, createItunesSearch, RateLimitError } from "./bulkCore.mjs";

const track = (trackName, artistName) => ({
  trackName, artistName, collectionName: "", artworkUrl100: `https://is1-ssl.mzstatic.com/${trackName}/100x100bb.jpg`,
});
const song = { song_title: "謎-rearrange version-", artist: "愛内里菜" };

test("findArtwork：1 回目で一致すればそこで止め、600px の画像を返す", async () => {
  const calls = [];
  const search = async (url) => { calls.push(url); return [track("謎", "愛内里菜")]; };
  const r = await findArtwork(song, search);
  assert.equal(r.image, "https://is1-ssl.mzstatic.com/謎/600x600bb.jpg");
  assert.equal(calls.length, 1);
});

test("findArtwork：検索は 1 曲 2 回まで", async () => {
  const calls = [];
  const search = async (url) => { calls.push(url); return []; };
  const r = await findArtwork(song, search);
  assert.equal(r.image, null);
  assert.equal(calls.length, 2);
});

test("findArtwork：歌手違いしか無ければ画像を付けない", async () => {
  const r = await findArtwork(song, async () => [track("謎", "別の歌手")]);
  assert.equal(r.image, null);
});

const ok = (results) => ({ ok: true, status: 200, json: async () => ({ results }) });
const ng = (status) => ({ ok: false, status, json: async () => ({}) });

test("createItunesSearch：回数制限なら待って再試行する", async () => {
  const waits = [];
  const fetchFn = async () => (fetchFn.n = (fetchFn.n ?? 0) + 1) === 1 ? ng(429) : ok([track("a", "b")]);
  const search = createItunesSearch({ fetchFn, sleep: async (ms) => waits.push(ms), intervalMs: 3200, backoffMs: 60000 });
  const results = await search("https://itunes.apple.com/search?term=x");
  assert.equal(results.length, 1);
  assert.ok(waits.includes(60000));
});

test("createItunesSearch：3 回続けて失敗したら RateLimitError で止める", async () => {
  const search = createItunesSearch({ fetchFn: async () => ng(403), sleep: async () => {}, intervalMs: 0, backoffMs: 0 });
  await assert.rejects(search("https://itunes.apple.com/search?term=x"), RateLimitError);
});

test("createItunesSearch：同じ URL は 2 回問い合わせない", async () => {
  let n = 0;
  const search = createItunesSearch({ fetchFn: async () => { n++; return ok([]); }, sleep: async () => {}, intervalMs: 0 });
  await search("https://itunes.apple.com/search?term=same");
  await search("https://itunes.apple.com/search?term=same");
  assert.equal(n, 1);
});

test("createItunesSearch：問い合わせの間隔を空ける", async () => {
  const waits = [];
  const search = createItunesSearch({ fetchFn: async () => ok([]), sleep: async (ms) => waits.push(ms), intervalMs: 3200 });
  await search("https://itunes.apple.com/search?term=a");
  assert.deepEqual(waits, [3200]);
});
