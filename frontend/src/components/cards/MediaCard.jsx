import styles from "./MediaCard.module.css";

/**
 * アニメ・アーティスト共通カード
 *
 * @param {"anime"|"artist"} type
 * @param {object}           data  アニメ or アーティストのオブジェクト
 * @param {function}         onClick (id) => void
 */
export default function MediaCard({ type, data, onClick }) {
  const isAnime = type === "anime";

  const imageUrl = data.image_url || null;
  const title    = isAnime ? data.title_jp : data.name;
  const meta     = isAnime
    ? [data.release_year ? `${data.release_year}年` : "", data.release_season || ""]
        .filter(Boolean).join(" ・ ")
    : data.role || "";

  return (
    <div className={styles.card} onClick={() => onClick?.(data.id)}>
      <div className={styles.imageWrapper}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className={styles.image} />
        ) : (
          <div className={styles.noImage}>NO IMAGE</div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.title}>{title}</div>
        <div className={styles.meta}>{meta}</div>
      </div>
    </div>
  );
}
