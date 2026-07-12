import placeholderProvider from "./placeholderProvider";
import adsenseProvider from "./adsenseProvider";

/* =========================================================
   広告プロバイダのファクトリ（Adapter パターンの切り替え点）
   - 設定の provider 名で実体を返す
   - admob(native) は未接続。Capacitorストア公開後に接続
   - 接続時はここに import して1行足すだけ。UI側の変更は不要
   ========================================================= */
const providers = {
  placeholder: placeholderProvider,
  adsense: adsenseProvider,      // Web（Google AdSense）
  // admob:   admobProvider,     // 将来: ネイティブ（Capacitor + AdMob）
};

export function getProvider(name) {
  return providers[name] || providers.placeholder;
}
