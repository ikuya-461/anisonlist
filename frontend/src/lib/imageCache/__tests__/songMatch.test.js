import {
  stripVersion,
  primaryArtist,
  artistMatches,
  buildSongQueries,
  itunesSearchUrl,
  pickBestSong,
} from "../songMatch.js";

// iTunes の検索結果 1 件を作る
const track = (trackName, artistName, collectionName = "") => ({
  trackName,
  artistName,
  collectionName,
  artworkUrl100: `https://is1-ssl.mzstatic.com/${encodeURIComponent(trackName)}/100x100bb.jpg`,
});

describe("stripVersion：検索用に版の表記を落とす", () => {
  test.each([
    ["謎-rearrange version-", "謎"],
    ["空中迷路(アコースティックver.)", "空中迷路"],
    ["Raise 〜Bloomy ver.〜", "raise"],
    ["涙なめなめソング -Band Ver.-", "涙なめなめソング"],
    ["夕暮れハッピーゴー つぐみソロVer.", "夕暮れハッピーゴー"],
    ["スマイルF 早倉舞衣ソロヴァージョン.", "スマイルf"],
    ["みんなDEダイエット 奥ソロバージョン", "みんなdeダイエット"],
    ["トンでもSUMMER ADVENTURE <Extra Drop Mix>", "トンでもsummer adventure"],
    ["パレード＜version 364＞", "パレード"],
    ["恋空リサイクリング featuring リサイクル!(Version“The ぶどう缶”)", "恋空リサイクリング"],
    ["Good Times Bad Times", "good times bad times"],
  ])("%s → %s", (input, expected) => {
    expect(stripVersion(input)).toBe(expected);
  });
});

describe("primaryArtist：検索用に先頭の歌手名だけを取る", () => {
  test.each([
    ["小倉唯", "小倉唯"],
    ["三好藍美(CV:稗田寧々)染谷波(CV:若山詩音)", "三好藍美"],
    ["MAHO堂(4人バージョン)", "maho堂"],
    ["ハムちゃんず, 小桜エツ子", "ハムちゃんず"],
    ["(インストゥルメンタル)", ""],
  ])("%s → %s", (input, expected) => {
    expect(primaryArtist(input)).toBe(expected);
  });
});

describe("artistMatches：表記差は一致、別人は不一致", () => {
  test.each([
    ["小倉唯", "小倉 唯"],
    ["Poppin’Party", "Poppin'Party"],
    ["ホフ・ディラン", "ホフディラン"],
    ["影山灯", "ベアトリス (CV. 影山 灯)"],
    ["林鼓子", "みらい(CV:林 鼓子)"],
    ["三好藍美(CV:稗田寧々)染谷波(CV:若山詩音)", "三好藍美(CV:稗田寧々) & 染谷波(CV:若山詩音)"],
    ["高森奈津美", "茅野愛衣, 中津真莉子 & 高森奈津美"],
    ["Gilbert O'sullivan", "Gilbert O’Sullivan"],
    ["中島愛", "ランカ・リー=中島愛"],
    ["96猫", "EIKO starring 96猫"],
    ["叶", "叶"],
    ["叶", "叶, 葛葉"],
    ["Star★Shiμʼne!!!", "Star★Shiμ'ne!!!"],
    ["Tommy heavenly^6", "Tommy heavenly6"],
  ])("一致：%s / %s", (a, b) => {
    expect(artistMatches(a, b)).toBe(true);
  });

  test.each([
    ["AiM", "Aimer"],
    ["真殿光昭", "Led Zeppelin"],
    ["Yusuke", "Hommarju"],
    ["salamander GOTOH", "Ryu*"],
    ["", "LiSA"],
    ["叶", "叶歌"],
  ])("不一致：%s / %s", (a, b) => {
    expect(artistMatches(a, b)).toBe(false);
  });
});

describe("buildSongQueries：検索語の候補", () => {
  test("今の検索語を最初に置き、版の表記を落とした検索語と曲名だけの検索語を続ける", () => {
    const qs = buildSongQueries({ song_title: "謎-rearrange version-", artist: "愛内里菜" });
    expect(qs.map((q) => q.term)).toEqual(["謎-rearrange version- 愛内里菜", "謎 愛内里菜", "謎"]);
  });

  test("同じ検索語は重ねない", () => {
    const qs = buildSongQueries({ song_title: "Galge", artist: "KOTOKO" });
    expect(qs.map((q) => q.term)).toEqual(["galge kotoko", "galge"]);
  });

  test("曲名だけの検索は候補を多めに取る", () => {
    const qs = buildSongQueries({ song_title: "Galge", artist: "KOTOKO" });
    expect(qs.map((q) => q.limit)).toEqual([10, 25]);
  });
});

test("itunesSearchUrl：今のアプリと同じ URL を作る", () => {
  expect(itunesSearchUrl("紅蓮華 lisa", 10)).toBe(
    "https://itunes.apple.com/search?term=%E7%B4%85%E8%93%AE%E8%8F%AF%20lisa&entity=song&country=JP&limit=10"
  );
});

describe("pickBestSong：採用する 1 件を選ぶ", () => {
  test("曲名が同じでも歌手が違えば採用しない", () => {
    const song = { song_title: "Good Times Bad Times", artist: "真殿光昭", anime_title: "恋する天使アンジェリーク" };
    expect(pickBestSong(song, [track("Good Times Bad Times (Live)", "Led Zeppelin", "Celebration Day")])).toBeNull();
  });

  test("歌手名の表記差は一致として採用する", () => {
    const song = { song_title: "Raise 〜Bloomy ver.〜", artist: "小倉唯" };
    const hit = track("Raise (Bloomy ver.)", "小倉 唯", "Labo-Ratory");
    expect(pickBestSong(song, [hit])).toBe(hit);
  });

  test("歌手が一致する候補の中で曲名が近いものを選ぶ", () => {
    const song = { song_title: "RISE", artist: "井口裕香" };
    const other = track("Strike my soul", "井口裕香");
    const hit = track("RISE", "井口裕香");
    expect(pickBestSong(song, [other, hit])).toBe(hit);
  });

  test("歌手が一致しても曲名が違えば採用しない", () => {
    const song = { song_title: "照れかくしのyawn", artist: "花澤香菜" };
    expect(pickBestSong(song, [track("インタリオ", "花澤香菜")])).toBeNull();
  });

  // アルバム名に作品名があっても、アニソンのカバー集・別歌手版が多いため歌手違いは採用しない
  // （2026-10-31 の再測定で、作品名で救った 19 件のうち 10 件が誤りだった）
  test("アルバム名に作品名があっても、歌手が違えば採用しない", () => {
    const song = { song_title: "ペガサス幻想-Pegasus Fantasy-", artist: "遠藤正明", anime_title: "聖闘士星矢" };
    const cover = track("ペガサス幻想-PEGASUS FANTASY- (OP)", "岩永雅子", "熱烈!アニソン魂 THE BEST カバー楽曲集 TVアニメシリーズ『聖闘士星矢』");
    expect(pickBestSong(song, [cover])).toBeNull();
  });

  test("版の表記を落とした曲名が一致すれば、短い曲名でも同じ曲とみなす", () => {
    const song = { song_title: "謎-rearrange version-", artist: "愛内里菜" };
    const hit = track("謎", "愛内里菜");
    expect(pickBestSong(song, [hit])).toBe(hit);
  });

  test("短い曲名は、ほかの曲名に含まれていても同じ曲とみなさない", () => {
    const song = { song_title: "i(REMIX-B)", artist: "長谷川明子" };
    const other = track("relations (M@STER VERSION)", "星井美希 (CV.長谷川明子) & 如月千早 (CV.今井麻美)");
    expect(pickBestSong(song, [other])).toBeNull();
  });

  test("曲名の ♥ などの記号の有無は同じ曲とみなす", () => {
    const song = { song_title: "ラブ♥ライス", artist: "茶太" };
    const hit = track("ラブ ライス", "茶太");
    expect(pickBestSong(song, [hit])).toBe(hit);
  });

  test("画像の無い候補は使わない", () => {
    const song = { song_title: "RISE", artist: "井口裕香" };
    expect(pickBestSong(song, [{ ...track("RISE", "井口裕香"), artworkUrl100: undefined }])).toBeNull();
  });
});
