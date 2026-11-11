import { useState } from "react";
import styles from "./MediaCard.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { valueLabel, SONG_TYPE_LABELS } from "../../lib/i18n";
import { songTitle } from "../../lib/displayText";
import { songDisplayImage } from "../../lib/imageCache/songDisplayImage";

export default function SongCard({ song, onAdd, onClick }) {
  const [added, setAdded] = useState(false);
  const { lang } = useLanguage();
  return (
    <div
      className={styles.card}
      onClick={() => onClick?.(song.song_id)}
    >
      {/* 画像 */}
      <div className={styles.imageWrapper}>
        {songDisplayImage(song) ? (
          <img
            src={songDisplayImage(song)}
            alt={song.song_title || song.title}
            className={styles.image}
          />
        ) : (
          <div className={styles.noImage}>NO IMAGE</div>
        )}

        {song.type && (
          <span
            className={`${styles.typeBadge} ${
              styles[song.type] || ""
            }`}
          >
            {valueLabel(SONG_TYPE_LABELS, song.type, lang)}
          </span>
        )}
      </div>

      {/* 曲情報 */}
      <div className={styles.info}>
        <div className={styles.title}>
          {songTitle(song, lang)}
        </div>

        <div className={styles.meta}>
          {song.artist || song.artist_name}
          {song.anime_title ? ` ・ ${song.anime_title}` : ""}
        </div>
      </div>

      {/* ログイン版だけ追加ボタンを表示 */}
      {onAdd && (
        <button
          className={`${styles.addBtn} ${added ? styles.addBtnAdded : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (added) return;
            onAdd(song);
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
