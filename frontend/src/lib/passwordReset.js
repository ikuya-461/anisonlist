/* =========================================================
   パスワード再設定（メールのリンク先で新しいパスワードを設定）
   - 再設定メールの戻り先パスと、入力チェック・エラー変換
   - 返り値は i18n のキー
   ========================================================= */

export const RESET_PASSWORD_PATH = "/reset-password";

// Supabase Auth の既定の最小文字数
export const MIN_PASSWORD_LENGTH = 6;

export function validateNewPassword(password, passwordConfirm) {
  if (!password.trim() || !passwordConfirm.trim()) return "auth.err.allFields";
  if (password.length < MIN_PASSWORD_LENGTH) return "auth.err.pwTooShort";
  if (password !== passwordConfirm) return "auth.err.pwMismatch";
  return null;
}

// supabase.auth.updateUser のエラーを表示用キーへ
export function resetErrorKey(error) {
  if (error?.code === "same_password") return "auth.err.samePassword";
  if (error?.code === "weak_password") return "auth.err.pwTooShort";
  return "auth.err.resetFailed";
}

// 再設定メールのリンクが設定画面以外に着いた場合（戻り先 URL が Supabase の
// 許可リストに無く Site URL へ戻された等）に、設定画面へ移すためのパスを返す。
// ハッシュ（トークン）は supabase-js が読むので保持する。移動不要なら null
export function recoveryRedirectPath(pathname, hash) {
  if (pathname === RESET_PASSWORD_PATH) return null;
  const params = new URLSearchParams((hash || "").replace(/^#/, ""));
  if (params.get("type") !== "recovery") return null;
  return RESET_PASSWORD_PATH + hash;
}
