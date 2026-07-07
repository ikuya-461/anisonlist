import { createContext, useContext, useMemo } from "react";
import { AD_CONFIG } from "../lib/ads/adConfig";
import { getProvider } from "../lib/ads/providers";
import { hasAdConsent } from "../lib/ads/consent";
import { useEntitlement } from "../lib/ads/useEntitlement";

/* =========================================================
   広告コンテキスト
   - 解決済み設定・プレミアム判定・プロバイダ実体・同意状態を供給
   - ページは <AdSlot> を置くだけで、ここから全部受け取る
   ========================================================= */
const AdContext = createContext({
  config: AD_CONFIG,
  isPremium: false,
  provider: null,
  consented: true,
});

export function AdProvider({ children }) {
  const { isPremium } = useEntitlement();

  const value = useMemo(() => ({
    config: AD_CONFIG,
    isPremium,
    provider: getProvider(AD_CONFIG.provider),
    consented: hasAdConsent(),
  }), [isPremium]);

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAds() {
  return useContext(AdContext);
}
