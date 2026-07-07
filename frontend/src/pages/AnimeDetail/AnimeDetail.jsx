import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAnimeDetail, getAnimeImage } from "../../lib/queries/anime";
import { ensureSongImages } from "../../lib/imageCache/songImageCache";
import { useDetailPage } from "../../hooks/useDetailPage";
import SongList from "../../components/list/SongList";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import AdSlot from "../../components/ads/AdSlot";
import { useLanguage } from "../../contexts/LanguageContext";
import { animeTitle } from "../../lib/displayText";
import { valueLabel, ANIME_TYPE_LABELS, SEASON_LABELS } from "../../lib/i18n";
import pageStyles from "../DetailPage.module.css";
import styles from "./AnimeDetail.module.css";

// コンポーネント外で安定した関数参照を確保（useDetailPage の deps に影響しない）
async function fetchAnimeDetail(id) {
  const data = await getAnimeDetail(id);
  if (!data) return null;
  return { anime: data.anime, songs: data.songs || [] };
}

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const { data, loading, setData } = useDetailPage(fetchAnimeDetail, id);

  // 画像はバックグラウンドで取得し(AniList/iTunes)、揃い次第差し替える
  // id ごとに1回だけ実行（画像が見つからない曲があっても再取得を繰り返さないようガード）
  const fetchedForId = useRef(null);
  useEffect(() => {
    if (!data || fetchedForId.current === id) return;
    fetchedForId.current = id;
    let cancelled = false;

    if (!data.anime.image_url) {
      getAnimeImage(data.anime.title_jp).then((image_url) => {
        if (cancelled || !image_url) return;
        setData((prev) => (prev ? { ...prev, anime: { ...prev.anime, image_url } } : prev));
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
  if (!data) return <div className={pageStyles.loading}>{t("detail.anime.notFound")}</div>;

  const { anime, songs } = data;

  // メイン表示は選択言語、サブ表示はもう一方の言語（重複時は非表示）
  const mainTitle = animeTitle(anime, lang);
  const subTitle  = lang === "en" ? anime.title_jp : (anime.title_en || anime.title_romaji);

  return (
    <div className={pageStyles.outer}>
      {/* 戻る */}
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>

      {/* アニメ画像 */}
      <img
        src={anime.image_url || "/noimage.png"}
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
        <div><strong>{t("detail.field.type")}：</strong>{valueLabel(ANIME_TYPE_LABELS, anime.type, lang)}</div>

        {anime.type === "Anime" ? (
          <>
            <div><strong>{t("detail.field.airYear")}：</strong>{anime.release_year}</div>
            <div><strong>{t("detail.field.season")}：</strong>{valueLabel(SEASON_LABELS, anime.release_season, lang)}</div>
          </>
        ) : (
          <>
            <div><strong>{t("detail.field.releaseYear")}：</strong>{anime.release_year}</div>
          </>
        )}
      </div>

      {/* 作品情報の後・曲セクションの前に1枠 */}
      <AdSlot placement="anime_detail" />

      {/* 曲一覧 */}
      <h2 className={pageStyles.sectionTitle}>{t("detail.section.animeSongs")}</h2>

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
          anime_title: mainTitle
        }))}
        sortable={false}
        onClickSong={(songId) => navigate(`/songs/${songId}`)}
      />
    </div>
  );
}
