import SearchSong from "../components/inputs/SearchSong";
import styles from "../CSS/PageCSS/Home.module.css";

export default function Home() {
  return (
    <div className={styles.outer}>
      <h1 className={styles.title}>アニソン検索アプリ</h1>
      <SearchSong heading="アニソン検索（公開）" />
    </div>
  );
}
