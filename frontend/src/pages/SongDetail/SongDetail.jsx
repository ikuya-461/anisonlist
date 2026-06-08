import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSongDetail } from "../../lib/queries/songs";
import styles from "../../CSS/PageCSS/SongDetail.module.css";

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const data = await getSongDetail(id);
        setSong(data);
      } catch (err) {
        console.error("SongDetail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [id]);

  if (loading) return <div className={styles.loading}>読み込み中...</div>;
  if (!song) return <div className={styles.loading}>曲が見つかりませんでした。</div>;

  const typeColor =
    song.song_type === "OP"
      ? "#ff6b6b"
      : song.song_type === "ED"
      ? "#4dabf7"
      : song.song_type === "IN"
      ? "#51cf66"
      : "#adb5bd";

  const formattedDate = song.release_date
    ? new Date(song.release_date).toISOString().split("T")[0]
    : "不明";

  const renderArtist = (name, artistId) => {
    if (!name) return "不明";
    if (!artistId) return name;

    return (
      <span
        className={styles.artistLink}
        onClick={() => navigate(`/artist/${artistId}`)}
      >
        {name}
      </span>
    );
  };

  return (
    <div className={styles.outer}>
      {/* 戻る */}
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      {/* 画像（fallback あり） */}
      <img
        src={song.image_url || "/noimage.png"}
        alt="anime"
        className={styles.image}
      />

      {/* タイトル + タイプ */}
      <div className={styles.titleRow}>
        {song.song_type && (
          <span className={styles.typeBadge} style={{ background: typeColor }}>
            {song.song_type}
            {song.sequence ? ` ${song.sequence}` : ""}
          </span>
        )}

        <h1 className={styles.title}>{song.song_title}</h1>
      </div>

      {/* アニメタイトル（クリックで遷移） */}
      <div
        className={styles.animeTitle}
        onClick={() => navigate(`/anime/${song.anime_id}`)}
      >
        🎬 {song.anime_title}
      </div>

      {/* 詳細情報 */}
      <div className={styles.infoBox}>
        <div>
          <strong>歌手：</strong>
          {renderArtist(song.artist, song.artist_id)}
        </div>
        <div>
          <strong>作詞：</strong>
          {renderArtist(song.lyricist, song.lyricist_id)}
        </div>
        <div>
          <strong>作曲：</strong>
          {renderArtist(song.composer, song.composer_id)}
        </div>
        <div>
          <strong>編曲：</strong>
          {renderArtist(song.arranger, song.arranger_id)}
        </div>
        <div><strong>公開日：</strong>{formattedDate}</div>

        {/* 曲情報 */}
        <div className={styles.songInfo}>
          <strong>曲情報：</strong>
          <div className={styles.songInfoText}>
            {song.song_info || "なし"}
          </div>
        </div>
      </div>
    </div>
  );
}
