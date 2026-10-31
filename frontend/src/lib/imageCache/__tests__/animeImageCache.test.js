import { fetchAnimeMeta, ensureAnimeMeta } from "../animeImageCache";
import { supabase } from "../../supabaseClient";

jest.mock("../../supabaseClient", () => ({
  supabase: { from: jest.fn() },
}));

const media = (native, year) => ({
  title: { native, romaji: `${native}-romaji`, english: `${native}-en` },
  synonyms: [],
  startDate: { year },
  seasonYear: year,
  popularity: 100,
  coverImage: { large: `https://s4.anilist.co/${year}-l.jpg`, extraLarge: `https://s4.anilist.co/${year}-xl.jpg` },
});
const anilist = (list) => ({ ok: true, json: () => Promise.resolve({ data: { Page: { media: list } } }) });
const sentTerm = (call) => JSON.parse(global.fetch.mock.calls[call][1].body).variables.s;

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

const yorimoi = { id: 7, title_jp: "宇宙よりも遠い場所 A Story that leads to the Antarctica", release_year: 2018 };

test("最初の検索で一致すれば、それ以上は問い合わせない", async () => {
  global.fetch.mockResolvedValueOnce(anilist([media("宇宙よりも遠い場所", 2018)]));
  const meta = await fetchAnimeMeta(yorimoi);
  expect(meta.cover).toBe("https://s4.anilist.co/2018-xl.jpg");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("候補が無ければ、副題を落とした題名で探し直す", async () => {
  global.fetch
    .mockResolvedValueOnce(anilist([]))
    .mockResolvedValueOnce(anilist([media("宇宙よりも遠い場所", 2018)]));
  const meta = await fetchAnimeMeta(yorimoi);
  expect(meta.cover).toBe("https://s4.anilist.co/2018-xl.jpg");
  expect(sentTerm(1)).toBe("宇宙よりも遠い場所");
});

test("発売年が離れたリメイクしか無ければ画像を付けない", async () => {
  global.fetch.mockResolvedValue(anilist([media("Dr.SLUMP", 1997)]));
  await expect(fetchAnimeMeta({ title_jp: "Dr.SLUMP", release_year: 1982 })).resolves.toBeNull();
});

test("ensureAnimeMeta は一致した作品の画像・英題・ローマ字を保存する", async () => {
  global.fetch.mockResolvedValueOnce(anilist([media("宇宙よりも遠い場所", 2018)]));
  const patch = await ensureAnimeMeta({ ...yorimoi, image_url: null, title_en: null, title_romaji: null });
  expect(patch).toEqual({
    image_url: "https://s4.anilist.co/2018-xl.jpg",
    title_en: "宇宙よりも遠い場所-en",
    title_romaji: "宇宙よりも遠い場所-romaji",
  });
  expect(update).toHaveBeenCalledWith(patch);
  expect(eq).toHaveBeenCalledWith("id", 7);
});
