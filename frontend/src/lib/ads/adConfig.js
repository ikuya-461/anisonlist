/* =========================================================
   広告システム設定（プロバイダ非依存・A/B・リモート化しやすい形）
   - ここ1か所で「出す/出さない・どこに・何個・どのカテゴリ・
     プレミアム扱い」を集中管理する
   - 将来リモート設定化する場合は、このモジュールを
     「fetch+cache して同じ形の config を返す」実装に差し替えるだけ
   - env（REACT_APP_ADS_*）で全体ON/OFFとプロバイダを上書きできる
   ========================================================= */

const envProvider = process.env.REACT_APP_ADS_PROVIDER;

// 広告を表示するか。
//   - 既定は「非表示」。本物の広告を接続するまでユーザーには一切出さない
//   - 本番で有効化するときは環境変数 REACT_APP_ADS_ENABLED=true をセット
//   - 開発時の確認用に localStorage "soniclist:ads-preview"="true" でも一時的に有効化できる
function resolveAdsEnabled() {
  const env = process.env.REACT_APP_ADS_ENABLED;
  if (env != null && env !== "") return env === "true";
  try {
    if (window.localStorage.getItem("soniclist:ads-preview") === "true") return true;
  } catch {
    /* localStorage 不可環境では無視 */
  }
  return false; // 既定: 非表示
}

// 優先的に表示したい広告カテゴリ（プロバイダ側のターゲティングに渡す）
export const AD_CATEGORIES = [
  "anime", "anison", "music_streaming", "cd", "bluray",
  "figure", "game", "live", "event", "audio", "earphone", "headphone",
];

// プレースメント（広告枠）の定義
//   format: "native" | "infeed" | "banner"
//   afterScroll: スクロールで枠が見えてから初表示（スクロール開始直後には出さない）
//   everyNItems: インフィードで N 件ごとに1枠差し込む
//   maxAds: そのページ/枠で出す最大数
export const AD_CONFIG = {
  enabled: resolveAdsEnabled(),
  provider: envProvider || "placeholder", // "placeholder" | "adsense" | "admob"
  categories: AD_CATEGORIES,
  premium: { hideAllAds: true }, // プレミアム会員は広告を全非表示
  placements: {
    home_feed:      { enabled: true, format: "native", maxAds: 1, afterScroll: true },
    search_infeed:  { enabled: true, format: "infeed", everyNItems: 5 },
    song_detail:    { enabled: true, format: "native", maxAds: 1 },
    anime_detail:   { enabled: true, format: "native", maxAds: 1 },
    // ランキングページは未実装。設定だけ用意し、ページ実装時に自動で点灯する
    ranking_infeed: { enabled: true, format: "infeed", everyNItems: 4 },
  },
};

// プレースメント設定を取得（全体無効・未定義・無効は null）
export function getPlacement(config, placement) {
  if (!config || !config.enabled) return null;
  const p = config.placements && config.placements[placement];
  if (!p || !p.enabled) return null;
  return p;
}
