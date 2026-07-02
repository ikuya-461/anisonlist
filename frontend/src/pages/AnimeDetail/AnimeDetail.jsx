import { useParams, useNavigate } from "react-router-dom";
import { getAnimeDetail, getAnimeImage } from "../../lib/queries/anime";
import { useDetailPage } from "../../hooks/useDetailPage";
import SongList from "../../components/list/SongList";
import { DetailSkeleton } from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";
import { animeTitle } from "../../lib/displayText";
import { valueLabel, ANIME_TYPE_LABELS, SEASON_LABELS } from "../../lib/i18n";
import pageStyles from "../DetailPage.module.css";
import styles from "./AnimeDetail.module.css";

// コンポーネント外で安定した関数参照を確保（useDetailPage の deps に影響しない）
async function fetchAnimeDetail(id) {
  const data = await getAnimeDetail(id);
  if (!data) return null;

  const image_url = await getAnimeImage(data.anime.title_jp);
  return {
    anime: { ...data.anime, image_url: image_url || data.anime.image_url },
    songs: data.songs || [],
  };
}

export default function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const { data, loading } = useDetailPage(fetchAnimeDetail, id);

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
