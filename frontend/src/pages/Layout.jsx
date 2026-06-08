import styles from "../CSS/PageCSS/Layout.module.css";

export default function Layout({ children }) {
  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        {children}
      </div>
    </div>
  );
}
