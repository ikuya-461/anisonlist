import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import logoHeader from "../../assets/logo-header.png";
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
        <img src={logoHeader} alt="SONICLIST #1" className={styles.logoImg} />
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
