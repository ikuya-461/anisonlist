import styles from "../../CSS/ComponentCSS/MediaCard.module.css";

export default function ArtistCard({ artist, onClick }) {
  return (
    <div className={styles.card} onClick={() => onClick?.(artist.id)}>
      <div className={styles.imageWrapper}>
        <div className={styles.noImage}>NO IMAGE</div>
      </div>

      <div className={styles.info}>
        <div className={styles.title}>{artist.name}</div>
        <div className={styles.meta}>{artist.role || ""}</div>
      </div>
    </div>
  );
}
