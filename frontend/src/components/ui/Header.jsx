import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import logoHeader from "../../assets/logo-header.png";

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
        <img src={logoHeader} alt="SONICLIST #1" className={styles.logoImg} />
      </Link>

      <span onClick={handleIconClick} className={styles.userIcon}>
        {isLoggedIn ? "👤" : "❔"}
      </span>
    </header>
  );
}
