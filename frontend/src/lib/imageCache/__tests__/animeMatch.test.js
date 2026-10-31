import { stripAnimeTitle, buildAnimeQueries, pickBestAnime } from "../animeMatch.js";

// AniList の検索結果 1 件を作る
const media = (native, year, extra = {}) => ({
  title: { native, romaji: extra.romaji ?? null, english: extra.english ?? null },
  synonyms: extra.synonyms ?? [],
  startDate: { year },
  seasonYear: year,
  popularity: extra.popularity ?? 100,
  coverImage: { large: `https://s4.anilist.co/${encodeURIComponent(native)}.jpg` },
});

describe("stripAnimeTitle：検索用に副題・期数を落とす", () => {
  test.each([
    ["宇宙よりも遠い場所 A Story that leads to the Antarctica", "宇宙よりも遠い場所"],
    ["トニカクカワイイ FLY ME TO THE MOON", "トニカクカワイイ"],
    ["半妖の夜叉姫 -戦国御伽草子-", "半妖の夜叉姫"],
    ["ドラえもん(新・第2期)", "ドラえもん"],
    ["D4DJ All Mix Dig Delight Direct Drive", "d4dj all mix dig delight direct drive"],
    ["Machgirl マッハガール", "machgirl マッハガール"],
  ])("%s → %s", (input, expected) => {
    expect(stripAnimeTitle(input)).toBe(expected);
  });
});

test("buildAnimeQueries：日本語題・副題を落とした題・英題の順（重複なし）", () => {
  expect(buildAnimeQueries({ title_jp: "半妖の夜叉姫 -戦国御伽草子-", title_en: "The Half-Demon Princess" }))
    .toEqual(["半妖の夜叉姫 -戦国御伽草子-", "半妖の夜叉姫", "the half-demon princess"]);
  expect(buildAnimeQueries({ title_jp: "CLANNAD", title_en: null })).toEqual(["clannad"]);
});

describe("pickBestAnime：採用する 1 件を選ぶ", () => {
  test("題名が同じでも、発売年が 2 年以上ずれるリメイクは採用しない", () => {
    const anime = { title_jp: "Dr.SLUMP", release_year: 1982 };
    expect(pickBestAnime(anime, [media("ドクタースランプ", 1997, { romaji: "Dr. Slump" })])).toBeNull();
  });

  test("部分一致の続編は、発売年が違えば採用しない", () => {
    const anime = { title_jp: "BURN-UP", release_year: 1991 };
    expect(pickBestAnime(anime, [media("バーンナップW", 1996, { romaji: "BURN-UP W" })])).toBeNull();
  });

  test("空白・記号の差は完全一致とみなし、部分一致の特別編より優先する", () => {
    const anime = { title_jp: "ゼロの使い魔~三美姫の輪舞~", release_year: 2008 };
    const special = media("ゼロの使い魔～三美姫の輪舞～ ピクチャードラマ", 2008, { popularity: 5000 });
    const tv = media("ゼロの使い魔 ～三美姫の輪舞～", 2008, { popularity: 100 });
    expect(pickBestAnime(anime, [special, tv])).toBe(tv);
  });

  test("候補の題名に入った読み仮名の括弧は落として比べる", () => {
    const anime = { title_jp: "ゼロの使い魔~三美姫の輪舞~", release_year: 2008 };
    const special = media("ゼロの使い魔～三美姫の輪舞～ ピクチャードラマ", 2008, { popularity: 5000 });
    const tv = media("ゼロの使い魔 ～三美姫（プリンセッセ）の輪舞（ロンド）～", 2008, { popularity: 100 });
    expect(pickBestAnime(anime, [special, tv])).toBe(tv);
  });

  test("副題付きの題名は、副題の無い候補と発売年が同じなら採用する", () => {
    const anime = { title_jp: "宇宙よりも遠い場所 A Story that leads to the Antarctica", release_year: 2018 };
    const hit = media("宇宙よりも遠い場所", 2018);
    expect(pickBestAnime(anime, [hit])).toBe(hit);
  });

  test("部分一致は発売年が 1 年ずれていれば採用しない（続く年の続編を避ける）", () => {
    const anime = { title_jp: "金田一少年の事件簿R", release_year: 2014 };
    expect(pickBestAnime(anime, [media("金田一少年の事件簿R【リターンズ】 第2期", 2015)])).toBeNull();
  });

  test("完全一致は発売年が 1 年ずれていても採用する（放送年と制作年の差）", () => {
    const anime = { title_jp: "CLANNAD", release_year: 2007 };
    const hit = media("CLANNAD", 2008);
    expect(pickBestAnime(anime, [hit])).toBe(hit);
  });

  test("発売年が分からないときは完全一致だけを採用する", () => {
    const anime = { title_jp: "アリス" };
    expect(pickBestAnime(anime, [media("トリック・オア・アリス", 2016)])).toBeNull();
    const hit = media("アリス", 1992);
    expect(pickBestAnime(anime, [hit])).toBe(hit);
  });

  test("英題・別名でも一致を判定する", () => {
    const anime = { title_jp: "001/7親指トム", title_en: "Tom of T.H.U.M.B.", release_year: 1967 };
    const hit = media("001/7 親指トム", 1967, { english: "Tom of T.H.U.M.B." });
    expect(pickBestAnime(anime, [hit])).toBe(hit);
  });

  test("同点なら発売年が近い方、それも同じなら人気の高い方を選ぶ", () => {
    const anime = { title_jp: "CLANNAD", release_year: 2007 };
    const near = media("CLANNAD", 2007, { popularity: 10 });
    const far = media("CLANNAD", 2008, { popularity: 9999 });
    expect(pickBestAnime(anime, [far, near])).toBe(near);
  });

  test("画像の無い候補は使わない", () => {
    const anime = { title_jp: "CLANNAD", release_year: 2007 };
    expect(pickBestAnime(anime, [{ ...media("CLANNAD", 2007), coverImage: null }])).toBeNull();
  });
});
