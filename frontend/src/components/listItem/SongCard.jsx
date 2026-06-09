import styles from "../../CSS/ComponentCSS/MediaCard.module.css";

export default function SongCard({ song, onAdd, onClick }) {
  return (
    <div
      className={styles.card}
      onClick={() => onClick?.(song.song_id)}
    >
      {/* 画像 */}
      <div className={styles.imageWrapper}>
        {song.image_url ? (
          <img
            src={song.image_url}
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
            {song.type}
          </span>
        )}
      </div>

      {/* 曲情報 */}
      <div className={styles.info}>
        <div className={styles.title}>
          {song.title || song.song_title}
        </div>

        <div className={styles.meta}>
          {song.artist || song.artist_name}
          {song.anime_title ? ` ・ ${song.anime_title}` : ""}
        </div>
      </div>

      {/* ログイン版だけ追加ボタンを表示 */}
      {onAdd && (
        <button
          className={styles.addBtn}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(song);
          }}
        >
          ＋
        </button>
      )}
    </div>
  );
}
