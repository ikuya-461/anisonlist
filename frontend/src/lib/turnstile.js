// Cloudflare Turnstile サイトキー（公開用＝フロントに埋めてよい種類のキー）
// - env REACT_APP_TURNSTILE_SITE_KEY で上書き可能
// - 未設定時は本番のサイトキーをフォールバックとして使う
export const TURNSTILE_SITE_KEY =
  process.env.REACT_APP_TURNSTILE_SITE_KEY || "0x4AAAAAADxSHUXPn-C-2YBs";
