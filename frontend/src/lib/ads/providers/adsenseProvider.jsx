import AdsenseAd from "../../../components/ads/AdsenseAd";
import { AD_CONFIG, ADSENSE_CLIENT } from "../adConfig";

/* =========================================================
   Google AdSense プロバイダ
   - プレースメントに adsenseSlot が未設定の間は何も描画しない
     （広告ユニット発行済みの枠から順次点灯していける）
   ========================================================= */
const adsenseProvider = {
  name: "adsense",

  init() {
    /* adsbygoogle.js は index.html <head> で読み込み済み */
  },

  renderSlot({ placement }) {
    const place = AD_CONFIG.placements[placement];
    const slot = place && place.adsenseSlot;
    if (!slot) return null;

    return <AdsenseAd client={ADSENSE_CLIENT} slot={slot} layoutKey={place.adsenseLayoutKey} />;
  },
};

export default adsenseProvider;
