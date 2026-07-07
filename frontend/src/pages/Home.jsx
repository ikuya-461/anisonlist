import { Link } from "react-router-dom";
import SearchSong from "../components/search/SearchSong";
import AdSlot from "../components/ads/AdSlot";
import { useLanguage } from "../contexts/LanguageContext";
import styles from "./Home.module.css";

export default function Home({ isLoggedIn }) {
  const { t } = useLanguage();
  return (
    <div className={styles.outer}>
      <div className={styles.heroWrap}>
        <div className={styles.noiseBg} aria-hidden="true" />
        <h1 className={styles.heroTitle}>
          <span className={styles.heroText}>SONICLIST</span>
          <span className={styles.heroHash}>#</span>
          <span className={styles.heroNum}>1</span>
        </h1>
      </div>

      {/* ログイン誘導（未ログイン時のみ） */}
      {!isLoggedIn && (
        <div className={styles.ctaWrap}>
          <p className={styles.ctaText}>
            {t("home.ctaText").split("\n").map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
          </p>
          <div className={styles.ctaBtns}>
            <Link to="/register" className={styles.ctaPrimary}>
              {t("home.getStarted")}
            </Link>
            <Link to="/login" className={styles.ctaSecondary}>
              {t("home.login")}
            </Link>
          </div>
        </div>
      )}

      <SearchSong heading="ANISON SEARCH" />

      {/* コンテンツの下に1枠だけ（スクロールで見えてから表示） */}
      <AdSlot placement="home_feed" />
    </div>
  );
}
