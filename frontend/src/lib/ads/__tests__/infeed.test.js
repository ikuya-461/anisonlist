import { shouldInsertAd } from "../infeed";

describe("shouldInsertAd", () => {
  test("everyN=5: 5件目(index=4)の直後に差し込む", () => {
    expect(shouldInsertAd(4, 12, 5)).toBe(true);
    expect(shouldInsertAd(9, 12, 5)).toBe(true);
  });

  test("境界以外では差し込まない", () => {
    expect(shouldInsertAd(0, 12, 5)).toBe(false);
    expect(shouldInsertAd(3, 12, 5)).toBe(false);
    expect(shouldInsertAd(5, 12, 5)).toBe(false);
  });

  test("末尾の直後には差し込まない（最後が広告で終わらない）", () => {
    // index=4 がちょうど末尾(total=5)なら false
    expect(shouldInsertAd(4, 5, 5)).toBe(false);
    // index=9 が末尾(total=10)なら false
    expect(shouldInsertAd(9, 10, 5)).toBe(false);
  });

  test("everyN が無効なら常に false", () => {
    expect(shouldInsertAd(4, 12, 0)).toBe(false);
    expect(shouldInsertAd(4, 12, undefined)).toBe(false);
    expect(shouldInsertAd(4, 12, null)).toBe(false);
  });

  test("everyN=1 でも末尾直後は出さない", () => {
    expect(shouldInsertAd(0, 3, 1)).toBe(true);
    expect(shouldInsertAd(1, 3, 1)).toBe(true);
    expect(shouldInsertAd(2, 3, 1)).toBe(false); // 末尾
  });
});
