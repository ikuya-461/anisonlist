import { getListSongs } from "../listSongs";
import { supabase } from "../../supabaseClient";

jest.mock("../../supabaseClient", () => ({
  supabase: { from: jest.fn() },
}));

const COVER = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1.jpg";
let select;

beforeEach(() => {
  jest.clearAllMocks();
  const order = jest.fn();
  const eq = jest.fn().mockReturnValue({ order });
  select = jest.fn().mockReturnValue({ eq });
  supabase.from.mockReturnValue({ select });
  order.mockResolvedValue({
    data: [{
      id: 10, song_id: 1, position: 1, memo: null, emotion_tags: null, encounter_type: null,
      song: { song_title: "曲", song_type: "OP", image_url: null, artist: { name: "歌手" }, anime: { title_jp: "作品", image_url: COVER } },
    }],
    error: null,
  });
});

test("曲と一緒に作品の表紙を読み、anime_image_url として返す", async () => {
  const [row] = await getListSongs("list-1");
  expect(select.mock.calls[0][0]).toMatch(/anime:anime!anime_id\s*\(\s*title_jp,\s*image_url\s*\)/);
  expect(row.image_url).toBeNull();
  expect(row.anime_image_url).toBe(COVER);
  expect(row.anime_title).toBe("作品");
});
