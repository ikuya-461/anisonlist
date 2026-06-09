/* =========================================================
   アプリ全体で共有する定数
   ========================================================= */

// --- ページネーション ---
export const PAGE_SIZE = 10;

// --- 外部 API ---
export const JIKAN_API_BASE      = "https://api.jikan.moe/v4";
export const ITUNES_SEARCH_API   = "https://itunes.apple.com/search";

// --- Jikan API レート制限対策（3 req/秒）---
export const JIKAN_REQUEST_INTERVAL_MS = 400;

// --- 曲タイプ別バッジカラー ---
export const SONG_TYPE_COLORS = {
  OP:      "#ff6b6b",
  ED:      "#4dabf7",
  IN:      "#51cf66",
  default: "#adb5bd",
};

// --- ドラッグ&ドロップ 起動制約（ListGallery） ---
export const DND_ACTIVATION_CONSTRAINT = { delay: 120, tolerance: 4 };
