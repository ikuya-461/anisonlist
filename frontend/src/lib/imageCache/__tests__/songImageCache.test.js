import { ensureSongImage, ensureSongImages } from "../songImageCache";
import { supabase } from "../../supabaseClient";

jest.mock("../../supabaseClient", () => ({
  supabase: { from: jest.fn() },
}));

const art = (name) => `https://is1-ssl.mzstatic.com/${name}/100x100bb.jpg`;
const itunes = (results) => ({ ok: true, json: () => Promise.resolve({ results }) });

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

let update;
let eq;
let select;
let inIds;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  eq = jest.fn().mockResolvedValue({ error: null });
  update = jest.fn().mockReturnValue({ eq });
  inIds = jest.fn().mockResolvedValue({ data: [], error: null });
  select = jest.fn().mockReturnValue({ in: inIds });
  supabase.from.mockReturnValue({ update, select });
  global.fetch = jest.fn();
});

const song = { id: 1, song_title: "謎-rearrange version-", artist: "愛内里菜", anime_title: "名探偵コナン" };

test("保存済みの画像があれば iTunes に問い合わせない", async () => {
  await expect(ensureSongImage({ ...song, image_url: "https://x/y.jpg" })).resolves.toBe("https://x/y.jpg");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("最初の検索で一致すれば、それ以上は問い合わせずに保存する", async () => {
  global.fetch.mockResolvedValueOnce(itunes([{ trackName: "謎 (rearrange version)", artistName: "愛内里菜", artworkUrl100: art("nazo") }]));
  const url = await ensureSongImage(song);
  expect(url).toBe("https://is1-ssl.mzstatic.com/nazo/600x600bb.jpg");
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledWith({ image_url: url });
  expect(eq).toHaveBeenCalledWith("id", 1);
});

test("一致しなければ次の検索語で探す", async () => {
  global.fetch
    .mockResolvedValueOnce(itunes([]))
    .mockResolvedValueOnce(itunes([{ trackName: "謎", artistName: "愛内里菜", artworkUrl100: art("nazo") }]));
  await expect(ensureSongImage(song)).resolves.toBe("https://is1-ssl.mzstatic.com/nazo/600x600bb.jpg");
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls[1][0]).toContain(encodeURIComponent("謎 愛内里菜"));
});

test("曲名が同じでも歌手が違う候補しか無ければ保存しない", async () => {
  global.fetch.mockResolvedValue(itunes([{ trackName: "謎", artistName: "別の歌手", artworkUrl100: art("other") }]));
  await expect(ensureSongImage(song)).resolves.toBeNull();
  expect(update).not.toHaveBeenCalled();
});

describe("探して見つからなかった記録（image_checked_at）", () => {
  const found = itunes([{ trackName: "謎", artistName: "愛内里菜", artworkUrl100: art("nazo") }]);

  test("最近探したばかりの曲は iTunes に問い合わせない", async () => {
    inIds.mockResolvedValue({ data: [{ id: 1, image_checked_at: daysAgo(10) }], error: null });
    await expect(ensureSongImage(song)).resolves.toBeNull();
    expect(inIds).toHaveBeenCalledWith("id", [1]);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  test("一定期間（90 日）を過ぎた曲は探し直す", async () => {
    inIds.mockResolvedValue({ data: [{ id: 1, image_checked_at: daysAgo(91) }], error: null });
    global.fetch.mockResolvedValue(found);
    await expect(ensureSongImage(song)).resolves.toBe("https://is1-ssl.mzstatic.com/nazo/600x600bb.jpg");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("まだ探していない曲は探す", async () => {
    inIds.mockResolvedValue({ data: [{ id: 1, image_checked_at: null }], error: null });
    global.fetch.mockResolvedValue(found);
    await expect(ensureSongImage(song)).resolves.toBe("https://is1-ssl.mzstatic.com/nazo/600x600bb.jpg");
  });

  test("記録を読めなくても、これまでどおり探す", async () => {
    inIds.mockResolvedValue({ data: null, error: new Error("network") });
    global.fetch.mockResolvedValue(found);
    await expect(ensureSongImage(song)).resolves.toBe("https://is1-ssl.mzstatic.com/nazo/600x600bb.jpg");
  });

  test("一覧では記録を 1 回だけ読み、記録のある曲を飛ばして残りだけ探す", async () => {
    inIds.mockResolvedValue({ data: [{ id: 2, image_checked_at: daysAgo(1) }], error: null });
    global.fetch.mockResolvedValue(found);
    const songs = [
      { ...song, song_id: 1 },
      { ...song, song_id: 2 },
      { ...song, song_id: 3, image_url: "https://x/y.jpg" },
    ];
    const result = await ensureSongImages(songs);
    expect(select).toHaveBeenCalledTimes(1);
    expect(inIds).toHaveBeenCalledWith("id", [1, 2]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.map((s) => s.image_url)).toEqual([
      "https://is1-ssl.mzstatic.com/nazo/600x600bb.jpg",
      null,
      "https://x/y.jpg",
    ]);
  });

  test("一覧の全曲に画像があれば記録も読まない", async () => {
    await ensureSongImages([{ ...song, image_url: "https://x/y.jpg" }]);
    expect(select).not.toHaveBeenCalled();
  });
});
