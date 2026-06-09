import SearchSong from "../components/search/SearchSong";
import styles from "./Home.module.css";
import logoHome from "../assets/logo-home.png";

export default function Home() {
  return (
    <div className={styles.outer}>
      <img src={logoHome} alt="SONICLIST #1" className={styles.heroLogo} />
      <SearchSong heading="ANISON SEARCH" />
    </div>
  );
}
