import { validateNewPassword, resetErrorKey, recoveryRedirectPath, MIN_PASSWORD_LENGTH } from "../passwordReset";

describe("validateNewPassword", () => {
  test("どちらかが空なら全項目入力エラー", () => {
    expect(validateNewPassword("", "abcdef")).toBe("auth.err.allFields");
    expect(validateNewPassword("abcdef", "")).toBe("auth.err.allFields");
    expect(validateNewPassword("   ", "   ")).toBe("auth.err.allFields");
  });

  test("最小文字数未満は文字数エラー", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateNewPassword(short, short)).toBe("auth.err.pwTooShort");
  });

  test("確認用と一致しなければ不一致エラー", () => {
    expect(validateNewPassword("abcdef1", "abcdef2")).toBe("auth.err.pwMismatch");
  });

  test("条件を満たせば null", () => {
    expect(validateNewPassword("abcdef1", "abcdef1")).toBeNull();
  });
});

describe("resetErrorKey", () => {
  test("旧パスワードと同じ", () => {
    expect(resetErrorKey({ code: "same_password" })).toBe("auth.err.samePassword");
  });

  test("弱いパスワード", () => {
    expect(resetErrorKey({ code: "weak_password" })).toBe("auth.err.pwTooShort");
  });

  test("セッション切れ・その他は汎用エラー", () => {
    expect(resetErrorKey({ code: "session_not_found" })).toBe("auth.err.resetFailed");
    expect(resetErrorKey({ message: "unknown" })).toBe("auth.err.resetFailed");
  });
});

describe("recoveryRedirectPath", () => {
  const hash = "#access_token=x&expires_in=3600&refresh_token=y&token_type=bearer&type=recovery";

  test("別のページに着いた再設定リンクは設定画面へ（ハッシュは保持）", () => {
    expect(recoveryRedirectPath("/", hash)).toBe("/reset-password" + hash);
  });

  test("すでに設定画面なら移動しない", () => {
    expect(recoveryRedirectPath("/reset-password", hash)).toBeNull();
  });

  test("再設定以外のリンク・ハッシュ無しは移動しない", () => {
    expect(recoveryRedirectPath("/", "#access_token=x&type=signup")).toBeNull();
    expect(recoveryRedirectPath("/", "")).toBeNull();
  });
});
