import styles from "./Layout.module.css";

export default function Layout({ children }) {
  return (
    <div className={styles.outer}>
      <main className={styles.inner}>
        {children}
      </main>
    </div>
  );
}
