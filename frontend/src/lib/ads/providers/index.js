import placeholderProvider from "./placeholderProvider";

/* =========================================================
   広告プロバイダのファクトリ（Adapter パターンの切り替え点）
   - 設定の provider 名で実体を返す
   - adsense(web) / admob(native) は未接続。アカウント・審査が前提
   - 接続時はここに import して1行足すだけ。UI側の変更は不要
   ========================================================= */
const providers = {
  placeholder: placeholderProvider,
  // adsense: adsenseProvider,   // 将来: Web（Google AdSense）
  // admob:   admobProvider,     // 将来: ネイティブ（Capacitor + AdMob）
};

export function getProvider(name) {
  return providers[name] || providers.placeholder;
}
