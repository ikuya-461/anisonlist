import { useParams, useNavigate } from "react-router-dom";
import { getArtistDetail } from "../../lib/queries/artists";
import { useDetailPage } from "../../hooks/useDetailPage";
import SongList from "../../components/listItem/SongList";
import styles from "../../CSS/PageCSS/ArtistDetail.module.css";

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading } = useDetailPage(getArtistDetail, id);

  if (loading) return <div className={styles.loading}>読み込み中...</div>;
  if (!data) return <div className={styles.loading}>アーティストが見つかりません。</div>;

  const { artist, songs } = data;

  return (
    <div className={styles.outer}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      <h1 className={styles.title}>{artist.name}</h1>
      {artist.role && <div className={styles.role}>{artist.role}</div>}

      <h2 className={styles.sectionTitle}>🎵 担当曲</h2>

      <SongList
        songs={songs.map((s) => ({
          id: s.song_id,
          song_id: s.song_id,
          title: s.song_title,
          song_title: s.song_title,
          type: s.song_type,
          image_url: s.image_url,
          artist: s.artist,
          anime_title: s.anime_title
        }))}
        sortable={false}
        onClickSong={(songId) => navigate(`/songs/${songId}`)}
      />
    </div>
  );
}
