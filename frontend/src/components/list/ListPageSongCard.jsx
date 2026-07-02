import styles from "./ListPageSongCard.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { valueLabel, EMOTION_LABELS, ENCOUNTER_LABELS, SONG_TYPE_LABELS } from "../../lib/i18n";
import { songTitle } from "../../lib/displayText";

export default function ListPageSongCard({
  song,
  onDeleted,
  onClick,
  dragHandleProps
}) {
  const { lang } = useLanguage();
  return (
    <div
      className={styles.card}
      onClick={() => onClick?.(song.song_id)} // ← songs の ID を渡す
    >
      {/* ドラッグハンドル（undefined でも安全） */}
      <div
        {...(dragHandleProps || {})}
        onClick={(e) => e.stopPropagation()}
        className={styles.dragHandle}
      >
        ≡
      </div>

      {/* 画像 */}
      <div className={styles.imageWrapper}>
        {song.image_url ? (
          <img src={song.image_url} alt="" className={styles.image} />
        ) : (
          <div className={styles.noImage}>NO IMAGE</div>
        )}

        {song.type && (
          <span
            className={`${styles.typeBadge} ${
              styles[song.type] || "" // ← 安全 fallback
            }`}
          >
            {valueLabel(SONG_TYPE_LABELS, song.type, lang)}
          </span>
        )}
      </div>

      {/* 曲情報 */}
      <div className={styles.info}>
        <div className={styles.title}>{songTitle(song, lang)}</div>
        <div className={styles.meta}>
          {song.artist}
          {song.anime_title ? ` ・ ${song.anime_title}` : ""}
        </div>
        {song.memo && (
          <div className={styles.memo}>💬 {song.memo}</div>
        )}
        {(song.emotion_tags?.length > 0 || song.encounter_type) && (
          <div className={styles.tagRow}>
            {song.emotion_tags?.map((tag) => (
              <span key={tag} className={styles.emotionTag}>{valueLabel(EMOTION_LABELS, tag, lang)}</span>
            ))}
            {song.encounter_type && (
              <span className={styles.encounterTag}>
                {valueLabel(ENCOUNTER_LABELS, song.encounter_type, lang)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 削除ボタン（list_songs の ID を使う） */}
      <button
        className={styles.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDeleted?.(song.id); // ← list_songs.id を削除
        }}
      >
        🗑️
      </button>
    </div>
  );
}
