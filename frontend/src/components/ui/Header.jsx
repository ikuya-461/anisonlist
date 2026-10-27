import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
// 表示は 90x36（CSS で高さ 36px）。高解像度端末向けに約3倍の 300x120 を WebP で用意
import logoHeader from "../../assets/logo-header.webp";
import { useLanguage } from "../../contexts/LanguageContext";

export default function Header({ isLoggedIn, updateLoginState }) {
  const navigate = useNavigate();
  const { lang, toggleLang } = useLanguage();

  const handleIconClick = () => {
    if (isLoggedIn) {
      navigate("/mypage");
    } else {
      navigate("/login");
    }
  };

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logoLink}>
        <img src={logoHeader} alt="SONICLIST #1" className={styles.logoImg} width={90} height={36} />
      </Link>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={toggleLang}
          className={styles.langToggle}
          aria-label={lang === "en" ? "Switch to Japanese" : "英語表示に切り替え"}
          title={lang === "en" ? "日本語に切り替え" : "Switch to English"}
        >
          <span className={lang === "ja" ? styles.langActive : ""}>JP</span>
          <span className={styles.langSep}>/</span>
          <span className={lang === "en" ? styles.langActive : ""}>EN</span>
        </button>

        <span onClick={handleIconClick} className={styles.userIcon}>
          {isLoggedIn ? "👤" : "❔"}
        </span>
      </div>
    </header>
  );
}
