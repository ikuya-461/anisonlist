import styles from "./ListPageSongCard.module.css";

const EMOTION_LABELS = {
  god:           "✨ 神曲",
  cry:           "😭 泣ける",
  hype:          "🔥 熱い",
  nostalgic:     "🕰️ エモい",
  life_changing: "💊 人生変わった",
  night_listen:  "🌙 夜聴く系",
  work_bgm:      "🥱 作業用",
  chuunibyou:    "💀 厨二病",
  lyrics_insane: "🤯 歌詞がヤバい",
};

const ENCOUNTER_LABELS = {
  anime:       "📺 アニメを見て",
  niconico:    "🎵 ニコニコ動画",
  youtube:     "🌐 YouTube",
  streaming:   "🎧 サブスク",
  sns:         "📱 SNS",
  friend:      "👥 友人に教わった",
  rhythm_game: "🎮 音ゲー",
  karaoke:     "🎤 カラオケ",
  live_event:  "🎪 ライブ・フェス",
  random:      "🔀 たまたま",
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
        {(song.emotion_tags?.length > 0 || song.encounter_type) && (
          <div className={styles.tagRow}>
            {song.emotion_tags?.map((t) => (
              <span key={t} className={styles.emotionTag}>{EMOTION_LABELS[t] ?? t}</span>
            ))}
            {song.encounter_type && (
              <span className={styles.encounterTag}>
                {ENCOUNTER_LABELS[song.encounter_type] ?? song.encounter_type}
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
