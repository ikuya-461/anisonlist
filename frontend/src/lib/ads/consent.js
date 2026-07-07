/* =========================================================
   広告の同意管理（CMPを後で差し込みやすくするための最小土台）
   - 今は既定で許可を返す。地域別規制やCMP導入時にここを実装する
   - localStorage に保存（"soniclist:ad-consent"）
   ========================================================= */
const STORAGE_KEY = "soniclist:ad-consent";

export function getConsent() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* localStorage 不可環境では無視 */
  }
}

// 広告表示が許可されているか。未設定は許可扱い
// （将来ここを地域別判定 / CMP の結果に置き換える）
export function hasAdConsent() {
  const c = getConsent();
  if (c == null) return true;
  return c.ads !== false;
}
