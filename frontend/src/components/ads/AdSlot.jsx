import { useEffect, useRef, useState } from "react";
import { useAds } from "../../contexts/AdContext";
import { getPlacement } from "../../lib/ads/adConfig";
import { trackImpression, trackClick } from "../../lib/ads/adAnalytics";
import styles from "./AdSlot.module.css";

/* =========================================================
   広告枠（ページが使う唯一の入口）
   - placement を渡すだけ。設定・プレミアム・同意・プロバイダは
     AdContext から受け取る
   - 高さを format ごとに固定 → 読み込み中スケルトンと同じ高さで
     レイアウトシフト(CLS)を起こさない
   - afterScroll 指定時はスクロールで枠が見えてから初表示
   ========================================================= */
export default function AdSlot({ placement, format: formatOverride, className = "" }) {
  const { config, isPremium, provider, consented } = useAds();
  const place = getPlacement(config, placement);
  const format = formatOverride || (place && place.format) || "native";
  const afterScroll = !!(place && place.afterScroll);

  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const impressed = useRef(false);

  // afterScroll 指定時はスクロールで見えてから表示（開始直後には出さない）
  useEffect(() => {
    if (!place || isPremium || !consented) return;
    if (!afterScroll) { setVisible(true); return; }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }

    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -10% 0px" });

    io.observe(el);
    return () => io.disconnect();
  }, [place, isPremium, consented, afterScroll]);

  // 表示されたら impression を1回だけ計測
  useEffect(() => {
    if (visible && !impressed.current) {
      impressed.current = true;
      trackImpression(placement, { format });
    }
  }, [visible, placement, format]);

  // 無効 / プレミアム / 同意なし / プロバイダ無し → 何も出さない（枠も取らない）
  if (!place || isPremium || !consented || !provider) return null;

  const handleClick = () => trackClick(placement, { format });

  return (
    <div ref={ref} className={`${styles.slot} ${styles[format] || ""} ${className}`}>
      {visible
        ? provider.renderSlot({ placement, format, categories: config.categories, onClick: handleClick })
        : <div className={styles.skeleton} aria-hidden="true" />}
    </div>
  );
}
