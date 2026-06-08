import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAnimeDetail, getAnimeImage } from "../../lib/queries/anime";
import SongList from "../../components/listItem/SongList";
import styles from "../../CSS/PageCSS/AnimeDetail.module.css";

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [anime, setAnime] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnime = async () => {
      try {
        const data = await getAnimeDetail(id);
        if (!data) return;

        setAnime(data.anime);
        setSongs(data.songs || []);

        const image_url = await getAnimeImage(data.anime.title_jp);

        setAnime((prev) => ({
          ...prev,
          image_url
        }));
      } catch (err) {
        console.error("AnimeDetail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnime();
  }, [id]);

  if (loading) return <div className={styles.loading}>読み込み中...</div>;
  if (!anime) return <div className={styles.loading}>アニメが見つかりません。</div>;

  return (
    <div className={styles.outer}>
      {/* 戻る */}
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      {/* アニメ画像 */}
      <img
        src={anime.image_url || "/noimage.png"}
        alt={anime.title_jp}
        className={styles.image}
      />

      {/* タイトル */}
      <h1 className={styles.title}>{anime.title_jp}</h1>
      {anime.title_en && <div className={styles.titleEn}>{anime.title_en}</div>}

      {/* 基本情報 */}
      <div className={styles.infoBox}>
        <div><strong>タイプ：</strong>{anime.type}</div>

        {anime.type === "Anime" ? (
          <>
            <div><strong>放送年：</strong>{anime.release_year}</div>
            <div><strong>シーズン：</strong>{anime.release_season}</div>
          </>
        ) : (
          <>
            <div><strong>リリース年：</strong>{anime.release_year}</div>
          </>
        )}
      </div>

      {/* 曲一覧 */}
      <h2 className={styles.sectionTitle}>🎵 このアニメの曲</h2>

      <SongList
        songs={songs.map((s) => ({
          id: s.song_id,
          title: s.song_title,
          type: s.song_type,
          sequence: s.sequence,
          image_url: s.image_url,
          artist: s.artist,
          anime_title: anime.title_jp
        }))}
        sortable={false}
        onSongClick={(song) => navigate(`/songs/${song.id}`)}
      />
    </div>
  );
}
