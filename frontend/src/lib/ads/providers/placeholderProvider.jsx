import PlaceholderAd from "../../../components/ads/PlaceholderAd";

/* =========================================================
   開発用ダミー広告プロバイダ（本物のSDKは未接続）
   - 自前パーツなので電光掲示板エフェクトを自由にかけられる
   - AdSense/AdMob 接続時は renderSlot の中身だけ差し替える
     （UI側 <AdSlot> は一切変更不要）
   ========================================================= */
const placeholderProvider = {
  name: "placeholder",

  init() {
    /* ダミーなので SDK 読み込み不要 */
  },

  renderSlot({ placement, format, categories, onClick }) {
    return (
      <PlaceholderAd
        placement={placement}
        format={format}
        categories={categories}
        onClick={onClick}
      />
    );
  },
};

export default placeholderProvider;
