import styles from "./Layout.module.css";

export default function Layout({ children }) {
  return (
    <div className={styles.outer}>
      <div className={styles.inner}>
        {children}
      </div>
    </div>
  );
}
