import styles from "./MediaCard.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { animeTitle, gameTitle, artistName } from "../../lib/displayText";

/**
 * アニメ・ゲーム・アーティスト共通カード
 *
 * @param {"anime"|"game"|"artist"} type
 * @param {object}                  data  アニメ/ゲーム/アーティストのオブジェクト
 * @param {function}                onClick (id) => void
 */
export default function MediaCard({ type, data, onClick }) {
  const { lang } = useLanguage();
  const isAnime = type === "anime";
  const isGame  = type === "game";

  const imageUrl = data.image_url || null;
  const title    = isAnime
    ? animeTitle(data, lang)
    : isGame
    ? gameTitle(data, lang)
    : artistName(data, lang);
  const meta     = isAnime
    ? [data.release_year ? `${data.release_year}年` : "", data.release_season || ""]
        .filter(Boolean).join(" ・ ")
    : isGame
    ? (data.release_year ? `${data.release_year}年` : "")
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
