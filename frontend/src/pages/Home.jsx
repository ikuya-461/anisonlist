import { Link } from "react-router-dom";
import SearchSong from "../components/search/SearchSong";
import styles from "./Home.module.css";

export default function Home({ isLoggedIn }) {
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
            プレイリストを作成・シェアするには<br />アカウントが必要です
          </p>
          <div className={styles.ctaBtns}>
            <Link to="/register" className={styles.ctaPrimary}>
              無料で始める
            </Link>
            <Link to="/login" className={styles.ctaSecondary}>
              ログイン
            </Link>
          </div>
        </div>
      )}

      <SearchSong heading="ANISON SEARCH" />
    </div>
  );
}
