import styles from "./ListPageSongCard.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { valueLabel, ANIME_TAG_LABELS, SEASON_LABELS } from "../../lib/i18n";
import { animeTitle } from "../../lib/displayText";

/* =========================================================
   アニメリストの1行カード（ListPageSongCard と同型・CSS流用）
   - タイトル / 年・シーズン / メモ / アニメタグ
   ========================================================= */
export default function AnimeListCard({
  item,
  onDeleted,
  onClick,
  dragHandleProps
}) {
  const { lang, t } = useLanguage();

  const meta = [
    item.release_year
      ? t("search.year.suffix", { year: item.release_year })
      : null,
    valueLabel(SEASON_LABELS, item.release_season, lang) || null
  ].filter(Boolean).join(" ・ ");

  return (
    <div
      className={styles.card}
      onClick={() => onClick?.(item.anime_id)}
    >
      {/* ドラッグハンドル */}
      <div
        {...(dragHandleProps || {})}
        onClick={(e) => e.stopPropagation()}
        className={styles.dragHandle}
      >
        ≡
      </div>

      {/* 画像 */}
      <div className={styles.imageWrapper}>
        {item.image_url ? (
          <img src={item.image_url} alt="" className={styles.image} />
        ) : (
          <div className={styles.noImage}>NO IMAGE</div>
        )}
      </div>

      {/* アニメ情報 */}
      <div className={styles.info}>
        <div className={styles.title}>{animeTitle(item, lang)}</div>
        {meta && <div className={styles.meta}>{meta}</div>}
        {item.memo && (
          <div className={styles.memo}>💬 {item.memo}</div>
        )}
        {item.anime_tags?.length > 0 && (
          <div className={styles.tagRow}>
            {item.anime_tags.map((tag) => (
              <span key={tag} className={styles.emotionTag}>
                {valueLabel(ANIME_TAG_LABELS, tag, lang)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        className={styles.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDeleted?.(item.id);
        }}
      >
        🗑️
      </button>
    </div>
  );
}
