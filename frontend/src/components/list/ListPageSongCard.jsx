import styles from "./ListPageSongCard.module.css";

const EMOTION_LABELS = {
  god:           "✨ 神曲",
  cry:           "😭 泣ける",
  hype:          "🔥 熱い",
  nostalgic:     "🕰️ エモい",
  life_changing: "💊 人生変わった",
};

export default function ListPageSongCard({
  song,
  onDeleted,
  onClick,
  dragHandleProps
}) {
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
            {song.type}
          </span>
        )}
      </div>

      {/* 曲情報 */}
      <div className={styles.info}>
        <div className={styles.title}>{song.title}</div>
        <div className={styles.meta}>
          {song.artist}
          {song.anime_title ? ` ・ ${song.anime_title}` : ""}
        </div>
        {song.memo && (
          <div className={styles.memo}>💬 {song.memo}</div>
        )}
        {song.emotion_tags?.length > 0 && (
          <div className={styles.tagRow}>
            {song.emotion_tags.map((t) => (
              <span key={t} className={styles.emotionTag}>{EMOTION_LABELS[t] ?? t}</span>
            ))}
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
