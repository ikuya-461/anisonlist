import SearchSongPublic from "../../components/inputs/SearchSongPublic";
import styles from "../../CSS/PageCSS/Home.module.css";

export default function Home() {
  return (
    <div className={styles.outer}>
      <h1 className={styles.title}>アニソン検索アプリ</h1>

      {/* 🔍 公開検索コンポーネント */}
      <SearchSongPublic />
    </div>
  );
}
