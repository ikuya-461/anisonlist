import { useEffect, useState } from "react";

/* =========================================================
   プレミアム会員判定（今はフラグのみ・決済は別フィーチャー）
   - 本番の会員判定（DB / IAP）を入れるまでの土台
   - 動作確認用に localStorage "soniclist:premium" = "true" で
     擬似的にプレミアムを有効化できる（広告が全非表示になる）
   ========================================================= */
export function useEntitlement() {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    try {
      setIsPremium(window.localStorage.getItem("soniclist:premium") === "true");
    } catch {
      setIsPremium(false);
    }
  }, []);

  return { isPremium };
}
