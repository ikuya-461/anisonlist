import { useState } from "react";
import styles from "./MediaCard.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { animeTitle, gameTitle, artistName } from "../../lib/displayText";
import { valueLabel, SEASON_LABELS } from "../../lib/i18n";

/**
 * アニメ・ゲーム・アーティスト共通カード
 *
 * @param {"anime"|"game"|"artist"} type
 * @param {object}                  data  アニメ/ゲーム/アーティストのオブジェクト
 * @param {function}                onClick (id) => void  カード本体クリック（詳細閲覧等）
 * @param {function}                [onAdd] (data) => void  渡すと「＋」追加ボタンを表示
 */
export default function MediaCard({ type, data, onClick, onAdd }) {
  const { lang, t } = useLanguage();
  const [added, setAdded] = useState(false);
  const isAnime = type === "anime";
  const isGame  = type === "game";

  const imageUrl = data.image_url || null;
  const title    = isAnime
    ? animeTitle(data, lang)
    : isGame
    ? gameTitle(data, lang)
    : artistName(data, lang);
  const yearText = (y) => (y ? t("search.year.suffix", { year: y }) : "");
  const meta     = isAnime
    ? [yearText(data.release_year), valueLabel(SEASON_LABELS, data.release_season, lang)]
        .filter(Boolean).join(" ・ ")
    : isGame
    ? yearText(data.release_year)
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

      {onAdd && (
        <button
          className={`${styles.addBtn} ${added ? styles.addBtnAdded : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (added) return;
            onAdd(data);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
        >
          {added ? "✓" : "＋"}
        </button>
      )}
    </div>
  );
}
