import { getPlacement } from "../adConfig";

const base = {
  enabled: true,
  placements: {
    home_feed: { enabled: true, format: "native", afterScroll: true },
    off_slot: { enabled: false, format: "native" },
  },
};

describe("getPlacement", () => {
  test("有効なプレースメントを返す", () => {
    expect(getPlacement(base, "home_feed")).toEqual(base.placements.home_feed);
  });

  test("無効なプレースメントは null", () => {
    expect(getPlacement(base, "off_slot")).toBeNull();
  });

  test("未定義のプレースメントは null", () => {
    expect(getPlacement(base, "does_not_exist")).toBeNull();
  });

  test("全体が無効なら常に null", () => {
    expect(getPlacement({ ...base, enabled: false }, "home_feed")).toBeNull();
  });

  test("config が無い場合も安全に null", () => {
    expect(getPlacement(null, "home_feed")).toBeNull();
    expect(getPlacement(undefined, "home_feed")).toBeNull();
  });
});
