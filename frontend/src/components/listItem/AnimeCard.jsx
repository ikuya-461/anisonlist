import styles from "../../CSS/ComponentCSS/SongCard.module.css";

export default function AnimeCard({ anime, onClick }) {
  return (
    <div className={styles.card} onClick={() => onClick?.(anime.id)}>
      <div className={styles.imageWrapper}>
        {anime.image_url ? (
          <img src={anime.image_url} alt={anime.title_jp} className={styles.image} />
        ) : (
          <div className={styles.noImage}>NO IMAGE</div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.title}>{anime.title_jp}</div>

        <div className={styles.meta}>
          {anime.release_year ? `${anime.release_year}年` : ""}
          {anime.release_season ? ` ・ ${anime.release_season}` : ""}
        </div>
      </div>
    </div>
  );
}
