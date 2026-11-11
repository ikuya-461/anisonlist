// 実行: node --test tools/image-accuracy/lib/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { findArtwork, createItunesSearch, createAniListSearch, findAnimeCover, RateLimitError } from "./bulkCore.mjs";

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

test("createItunesSearch：回数制限なら 10 分待って再試行する", async () => {
  const waits = [];
  const fetchFn = async () => (fetchFn.n = (fetchFn.n ?? 0) + 1) === 1 ? ng(429) : ok([track("a", "b")]);
  const search = createItunesSearch({ fetchFn, sleep: async (ms) => waits.push(ms), intervalMs: 3200 });
  const results = await search("https://itunes.apple.com/search?term=x");
  assert.equal(results.length, 1);
  assert.ok(waits.includes(600000));
});

test("createItunesSearch：一時的な失敗（404 や通信エラー）が 6 回続いても、その後成功すれば止めない", async () => {
  let n = 0;
  const fetchFn = async () => {
    n++;
    if (n <= 3) return ng(404);
    if (n <= 6) throw new Error("ECONNRESET");
    return ok([track("a", "b")]);
  };
  const search = createItunesSearch({ fetchFn, sleep: async () => {}, intervalMs: 0 });
  const results = await search("https://itunes.apple.com/search?term=x");
  assert.equal(results.length, 1);
  assert.equal(n, 7);
});

test("createItunesSearch：約 1 時間（7 回）失敗が続いたら RateLimitError で止める", async () => {
  let n = 0;
  const waits = [];
  const search = createItunesSearch({ fetchFn: async () => { n++; return ng(403); }, sleep: async (ms) => waits.push(ms), intervalMs: 0 });
  await assert.rejects(search("https://itunes.apple.com/search?term=x"), RateLimitError);
  assert.equal(n, 7);
  assert.equal(waits.filter((ms) => ms === 600000).length, 6);
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

const media = (native, year, cover = `https://s4.anilist.co/file/${year}.jpg`) => ({
  title: { native, romaji: null, english: null }, synonyms: [], startDate: { year }, format: "TV", popularity: 100,
  coverImage: { extraLarge: cover, large: cover },
});
const bocchi = { id: 7, title_jp: "ぼっち・ざ・ろっく！", title_en: null, release_year: 2022 };

test("findAnimeCover：1 回目で一致すればそこで止め、表紙と題名を返す", async () => {
  const terms = [];
  const search = async (term) => { terms.push(term); return [{ ...media("ぼっち・ざ・ろっく！", 2022), title: { native: "ぼっち・ざ・ろっく！", romaji: "Bocchi the Rock!", english: "BOCCHI THE ROCK!" } }]; };
  const r = await findAnimeCover(bocchi, search);
  assert.equal(r.cover, "https://s4.anilist.co/file/2022.jpg");
  assert.equal(r.title_en, "BOCCHI THE ROCK!");
  assert.equal(r.title_romaji, "Bocchi the Rock!");
  assert.equal(terms.length, 1);
});

test("findAnimeCover：年が違う候補しか無ければ表紙を付けない", async () => {
  const r = await findAnimeCover(bocchi, async () => [media("ぼっち・ざ・ろっく！", 2015)]);
  assert.equal(r.cover, null);
});

test("findAnimeCover：見つからなければ検索語を順に試す", async () => {
  const terms = [];
  const anime = { title_jp: "進撃の巨人 The Final Season", title_en: "Attack on Titan", release_year: 2020 };
  const r = await findAnimeCover(anime, async (term) => { terms.push(term); return []; });
  assert.equal(r.cover, null);
  assert.equal(r.queriesUsed, terms.length);
  assert.ok(terms.length >= 2);
});

test("createAniListSearch：題名を変数で POST し、作品の一覧を返す", async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ data: { Page: { media: [media("x", 2020)] } } }) }; };
  const search = createAniListSearch({ fetchFn, sleep: async () => {}, intervalMs: 0 });
  const results = await search("ぼっち");
  assert.equal(results.length, 1);
  assert.equal(calls[0].url, "https://graphql.anilist.co");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(JSON.parse(calls[0].init.body).variables.s, "ぼっち");
});

test("createAniListSearch：回数制限なら待って再試行し、続けば RateLimitError で止める", async () => {
  const waits = [];
  const search = createAniListSearch({ fetchFn: async () => ng(429), sleep: async (ms) => waits.push(ms), intervalMs: 0 });
  await assert.rejects(search("x"), RateLimitError);
  assert.ok(waits.includes(600000));
});
