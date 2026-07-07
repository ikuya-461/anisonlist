import styles from "./AdFrame.module.css";

/* =========================================================
   サイバーパンク電光掲示板フレーム
   - 自前スタイルなので本物の広告にも流用できる
     （中身の広告 creative には触れず、周囲の枠だけ装飾する＝規約セーフ）
   - label: 「広告 / PR」表示（広告と分かる明示は各ネットワークの必須要件）
   ========================================================= */
export default function AdFrame({ children, label, format, onClick }) {
  return (
    <div
      className={`${styles.frame} ${styles[format] || ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <span className={styles.scanlines} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
