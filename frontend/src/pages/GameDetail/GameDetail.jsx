import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGameDetail, getGameImage } from "../../lib/queries/games";
import { ensureSongImages } from "../../lib/imageCache/songImageCache";
import { useDetailPage } from "../../hooks/useDetailPage";
import SongList from "../../components/list/SongList";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";
import { gameTitle } from "../../lib/displayText";
import pageStyles from "../DetailPage.module.css";
import styles from "./GameDetail.module.css";

// コンポーネント外で安定した関数参照を確保（useDetailPage の deps に影響しない）
async function fetchGameDetail(id) {
  const data = await getGameDetail(id);
  if (!data) return null;
  return { game: data.game, songs: data.songs || [] };
}

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const { data, loading, setData } = useDetailPage(fetchGameDetail, id);

  // 画像はバックグラウンドで取得し(RAWG/iTunes)、揃い次第差し替える
  // id ごとに1回だけ実行（画像が見つからない曲があっても再取得を繰り返さないようガード）
  const fetchedForId = useRef(null);
  useEffect(() => {
    if (!data || fetchedForId.current === id) return;
    fetchedForId.current = id;
    let cancelled = false;

    if (!data.game.image_url) {
      getGameImage(data.game.title_jp).then((image_url) => {
        if (cancelled || !image_url) return;
        setData((prev) => (prev ? { ...prev, game: { ...prev.game, image_url } } : prev));
      });
    }

    if (data.songs.some((s) => !s.image_url)) {
      ensureSongImages(data.songs).then((withImages) => {
        if (cancelled) return;
        setData((prev) => (prev ? { ...prev, songs: withImages } : prev));
      });
    }

    return () => { cancelled = true; };
  }, [data, id, setData]);

  if (loading) return <div className={pageStyles.outer}><DetailSkeleton /></div>;
  if (!data) return <div className={pageStyles.loading}>{t("detail.game.notFound")}</div>;

  const { game, songs } = data;

  const mainTitle = gameTitle(game, lang);
  const subTitle  = lang === "en" ? game.title_jp : game.title_en;

  return (
    <div className={pageStyles.outer}>
      {/* 戻る */}
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>

      {/* ゲーム画像 */}
      <img
        src={game.image_url || "/noimage.png"}
        alt={mainTitle}
        className={styles.image}
      />

      {/* タイトル */}
      <h1 className={pageStyles.title}>{mainTitle}</h1>
      {subTitle && subTitle !== mainTitle && (
        <div className={styles.titleEn}>{subTitle}</div>
      )}

      {/* 基本情報 */}
      <div className={styles.infoBox}>
        <div><strong>{t("detail.field.releaseYear")}：</strong>{game.release_year || t("common.unknown")}</div>
      </div>

      {/* 曲一覧 */}
      <h2 className={pageStyles.sectionTitle}>{t("detail.section.gameSongs")}</h2>

      <SongList
        songs={songs.map((s) => ({
          id: s.song_id,
          song_id: s.song_id,
          title: s.song_title,
          song_title: s.song_title,
          type: s.song_type,
          sequence: s.sequence,
          image_url: s.image_url,
          artist: s.artist,
          game_title: mainTitle
        }))}
        sortable={false}
        onClickSong={(songId) => navigate(`/songs/${songId}`)}
      />
    </div>
  );
}
