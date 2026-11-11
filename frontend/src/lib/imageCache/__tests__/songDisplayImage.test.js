import { songDisplayImage } from "../songDisplayImage";

const JACKET = "https://is1-ssl.mzstatic.com/a/600x600bb.jpg";
const COVER = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1.jpg";

test("曲の画像があればそれを出す（作品の表紙より優先）", () => {
  expect(songDisplayImage({ image_url: JACKET, anime_image_url: COVER })).toBe(JACKET);
});

test("曲の画像が無ければ作品の表紙を代わりに出す", () => {
  expect(songDisplayImage({ image_url: null, anime_image_url: COVER })).toBe(COVER);
});

test("どちらも無ければ null（NO IMAGE）", () => {
  expect(songDisplayImage({ image_url: null, anime_image_url: null })).toBeNull();
  expect(songDisplayImage({})).toBeNull();
});
