import { useParams, useNavigate } from "react-router-dom";
import { getSongDetail } from "../../lib/queries/songs";
import { useDetailPage } from "../../hooks/useDetailPage";
import { SONG_TYPE_COLORS } from "../../lib/constants";
import pageStyles from "../DetailPage.module.css";
import styles from "./SongDetail.module.css";

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: song, loading } = useDetailPage(getSongDetail, id);

  if (loading) return <div className={pageStyles.loading}>読み込み中...</div>;
  if (!song) return <div className={pageStyles.loading}>曲が見つかりませんでした。</div>;

  const typeColor = SONG_TYPE_COLORS[song.song_type] ?? SONG_TYPE_COLORS.default;

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
