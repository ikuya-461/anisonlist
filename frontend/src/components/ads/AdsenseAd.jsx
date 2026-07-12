import { useEffect, useRef } from "react";

/* =========================================================
   Google AdSense の広告ユニット（<ins class="adsbygoogle">）
   - adsbygoogle.js 本体は index.html <head> で読み込み済み
   - マウント時に1回だけ push({}) する（同じinsへの二重pushはエラーになる）
   - 広告本体（creative）はGoogleのiframeが差し込むため、クリックの
     計測はここでは行わない（クロスオリジンで検知不可。AdSense側で集計される）
   - layoutKey 指定時＝インフィード/ネイティブ広告（fluid形式）
     未指定＝ディスプレイ広告（auto + full-width-responsive）
   ========================================================= */
export default function AdsenseAd({ client, slot, layoutKey }) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* adsbygoogle.js 未読込等は静かに無視（可用性優先） */
    }
  }, []);

  const fluidProps = layoutKey
    ? { "data-ad-format": "fluid", "data-ad-layout-key": layoutKey }
    : { "data-ad-format": "auto", "data-full-width-responsive": "true" };

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", height: "100%" }}
      data-ad-client={client}
      data-ad-slot={slot}
      {...fluidProps}
    />
  );
}
