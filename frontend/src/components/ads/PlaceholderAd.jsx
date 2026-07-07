import { useLanguage } from "../../contexts/LanguageContext";
import AdFrame from "./AdFrame";
import styles from "./PlaceholderAd.module.css";

/* =========================================================
   開発用ダミー広告（本物のSDK未接続時に表示）
   - 自前パーツなので電光掲示板エフェクト全開でOK（規約は無関係）
   - 本番プロバイダ差し替え時は、この中身ごと本物の広告に置き換える
   - onClick は計測用（AdSlot から渡される）
   ========================================================= */
export default function PlaceholderAd({ format, categories = [], onClick }) {
  const { t } = useLanguage();
  const tag = categories[0] || "anime";

  return (
    <AdFrame label={t("ad.label")} format={format} onClick={onClick}>
      <div className={styles.marqueeWrap} aria-hidden="true">
        <div className={styles.marquee}>
          <span>{t("ad.placeholderText")}</span>
          <span>{t("ad.placeholderText")}</span>
        </div>
      </div>
      <div className={styles.meta}>
        <span className={styles.tag}>#{tag}</span>
        <span className={styles.hint}>{t("ad.placeholderHint")}</span>
      </div>
    </AdFrame>
  );
}
