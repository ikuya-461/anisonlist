import styles from "../../CSS/ComponentCSS/ErrorMessage.module.css";

export default function ErrorMessage({ children }) {
  if (!children) return null;

  return (
    <div className={styles.error}>
      {children}
    </div>
  );
}
