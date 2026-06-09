import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";

export default function Header({ isLoggedIn, updateLoginState }) {
  const navigate = useNavigate();

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
        <h1 className={styles.logoTitle}>SONICLIST</h1>
        <span className={styles.logoTag}>#1</span>
      </Link>

      <span onClick={handleIconClick} className={styles.userIcon}>
        {isLoggedIn ? "👤" : "❔"}
      </span>
    </header>
  );
}
