import { ensureSongImage } from "../songImageCache";
import { supabase } from "../../supabaseClient";

jest.mock("../../supabaseClient", () => ({
  supabase: { from: jest.fn() },
}));

const art = (name) => `https://is1-ssl.mzstatic.com/${name}/100x100bb.jpg`;
const itunes = (results) => ({ ok: true, json: () => Promise.resolve({ results }) });

let update;
let eq;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  eq = jest.fn().mockResolvedValue({ error: null });
  update = jest.fn().mockReturnValue({ eq });
  supabase.from.mockReturnValue({ update });
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
