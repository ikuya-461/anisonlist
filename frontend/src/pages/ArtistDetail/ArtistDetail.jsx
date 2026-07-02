import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArtistDetail } from "../../lib/queries/artists";
import { ensureArtistImage } from "../../lib/imageCache/artistImageCache";
import { ensureArtistNameEn } from "../../lib/imageCache/artistNameCache";
import { ensureSongImages } from "../../lib/imageCache/songImageCache";
import SongList from "../../components/list/SongList";
import Button from "../../components/ui/Button";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";
import { artistName } from "../../lib/displayText";
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
  const { lang, t } = useLanguage();

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

  // 画像・英語名・曲画像はバックグラウンドで取得し(iTunes/MusicBrainz)、揃い次第差し替える
  // (id, page) の組ごとに1回だけ実行（見つからない項目があっても再取得を繰り返さないようガード）
  const fetchedKeyRef = useRef(null);
  useEffect(() => {
    if (!data) return;
    const key = `${id}:${page}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;
    let cancelled = false;

    if (!data.artist.image_url) {
      ensureArtistImage(data.artist).then((image_url) => {
        if (cancelled || !image_url) return;
        setData((prev) => (prev ? { ...prev, artist: { ...prev.artist, image_url } } : prev));
      });
    }
    if (!data.artist.name_en) {
      ensureArtistNameEn(data.artist).then((name_en) => {
        if (cancelled || !name_en) return;
        setData((prev) => (prev ? { ...prev, artist: { ...prev.artist, name_en } } : prev));
      });
    }
    if (data.songs.some((s) => !s.image_url)) {
      ensureSongImages(data.songs).then((withImages) => {
        if (cancelled) return;
        setData((prev) => (prev ? { ...prev, songs: withImages } : prev));
      });
    }

    return () => { cancelled = true; };
  }, [data, id, page, setData]);

  if (loading && !data) return <div className={pageStyles.outer}><DetailSkeleton /></div>;
  if (!data) return <div className={pageStyles.loading}>{t("detail.artist.notFound")}</div>;

  const { artist, songs, total, totalPages } = data;

  const changePage = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={pageStyles.outer}>
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>

      {artist.image_url && (
        <img src={artist.image_url} alt={artistName(artist, lang)} className={styles.artistImage} />
      )}

      <h1 className={pageStyles.title}>{artistName(artist, lang)}</h1>
      {(() => {
        const sub = lang === "en" ? artist.name : artist.name_en;
        return sub && sub !== artistName(artist, lang)
          ? <div className={styles.nameSub}>{sub}</div>
          : null;
      })()}
      {artist.role && <div className={styles.role}>{artist.role}</div>}

      <h2 className={pageStyles.sectionTitle}>{t("detail.section.artistSongs")}</h2>
      {total > 0 && (
        <div className={styles.count}>
          {totalPages > 1
            ? t("detail.artist.totalPaged", { total, page, pages: totalPages })
            : t("detail.artist.total", { total })}
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
            {t("search.pager.prev")}
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
            {t("search.pager.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
