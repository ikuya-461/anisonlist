import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArtistDetail } from "../../lib/queries/artists";
import SongList from "../../components/list/SongList";
import Button from "../../components/ui/Button";
import pageStyles from "../DetailPage.module.css";
import styles from "./ArtistDetail.module.css";

const getPageNumbers = (current, total) => {
  const pages = [1];
  if (current > 3) pages.push("…");
  for (let i = current - 1; i <= current + 1; i++) {
    if (i > 1 && i < total) pages.push(i);
  }
  if (current < total - 2) pages.push("…");
  if (total > 1) pages.push(total);
  return pages;
};

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // アーティストが変わったら 1 ページ目に戻す
  useEffect(() => {
    setPage(1);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getArtistDetail(id, page)
      .then((result) => {
        if (!cancelled) setData(result ?? null);
      })
      .catch((err) => console.error("ArtistDetail load error:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, page]);

  if (loading && !data) return <div className={pageStyles.loading}>読み込み中...</div>;
  if (!data) return <div className={pageStyles.loading}>アーティストが見つかりません。</div>;

  const { artist, songs, total, totalPages } = data;

  const changePage = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={pageStyles.outer}>
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      <h1 className={pageStyles.title}>{artist.name}</h1>
      {artist.role && <div className={styles.role}>{artist.role}</div>}

      <h2 className={pageStyles.sectionTitle}>🎵 担当曲</h2>
      {total > 0 && (
        <div className={styles.count}>
          全 {total} 曲{totalPages > 1 ? `（${page} / ${totalPages} ページ）` : ""}
        </div>
      )}

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

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button disabled={page <= 1} onClick={() => changePage(page - 1)} className={styles.pageBtn}>
            ← 前へ
          </Button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={i} className={styles.dots}>…</span>
            ) : (
              <Button
                key={i}
                onClick={() => changePage(p)}
                className={`${styles.pageBtn} ${page === p ? styles.activePage : ""}`}
              >
                {p}
              </Button>
            )
          )}

          <Button disabled={page >= totalPages} onClick={() => changePage(page + 1)} className={styles.pageBtn}>
            次へ →
          </Button>
        </div>
      )}
    </div>
  );
}
