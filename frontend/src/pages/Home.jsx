import SearchSong from "../components/search/SearchSong";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.outer}>
      <div className={styles.heroWrap}>
        {/* グリッチラインのノイズ背景 */}
        <div className={styles.noiseBg} aria-hidden="true" />

        {/* メインタイトル */}
        <h1 className={styles.heroTitle}>
          <span className={styles.heroText}>SONICLIST</span>
          <span className={styles.heroHash}>#</span>
          <span className={styles.heroNum}>1</span>
        </h1>
      </div>

      <SearchSong heading="ANISON SEARCH" />
    </div>
  );
}
