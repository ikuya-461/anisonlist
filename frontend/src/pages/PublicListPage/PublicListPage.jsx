import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { getPublicListDetail, getListLikeStatus, toggleListLike } from "../../lib/queries/lists";
import { getListSongs } from "../../lib/queries/listSongs";
import { getListAnime } from "../../lib/queries/listAnime";
import { getPublicProfile } from "../../lib/queries/users";
import { ensureSongImages } from "../../lib/imageCache/songImageCache";
import { ensureAnimeImages } from "../../lib/imageCache/animeImageCache";
import { useLanguage } from "../../contexts/LanguageContext";
import { valueLabel, EMOTION_LABELS, ENCOUNTER_LABELS, ANIME_TAG_LABELS, SEASON_LABELS } from "../../lib/i18n";
import { songTitle, animeTitle } from "../../lib/displayText";

import pageStyles from "../DetailPage.module.css";
import styles from "./PublicListPage.module.css";

export default function PublicListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const [listInfo, setListInfo] = useState(null);
  const [songs, setSongs] = useState([]);
  const [author, setAuthor] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const list = await getPublicListDetail(id);
      if (!list) { setLoading(false); return; }

      setListInfo(list);

      // リストタイプで取得先を切替（song→list_songs / anime→list_anime）
      const isAnime = list.list_type === "anime";
      const fetchItems = isAnime ? getListAnime(id) : getListSongs(id);
      const [itemsData, likeStatus, authorData] = await Promise.all([
        fetchItems,
        getListLikeStatus(id),
        getPublicProfile(list.user_id),
      ]);

      if (cancelled) return;
      setSongs(itemsData);
      setLikeCount(likeStatus.count);
      setLiked(likeStatus.liked);
      setAuthor(authorData);
      setLoading(false);

      // 画像が未キャッシュの曲/アニメをバックグラウンドで補完する（表示はブロックしない）
      if (isAnime) {
        if (itemsData.some((a) => !a.image_url)) {
          const toFetch = itemsData.map((a) => ({
            id: a.anime_id,
            title_jp: a.title_jp,
            title_en: a.title_en,
            title_romaji: a.title_romaji,
            release_year: a.release_year,
            image_url: a.image_url,
          }));
          ensureAnimeImages(toFetch).then((withImages) => {
            if (cancelled) return;
            setSongs((prev) =>
              prev.map((a) => {
                const found = withImages.find((w) => w.id === a.anime_id);
                return found
                  ? {
                      ...a,
                      image_url: found.image_url ?? a.image_url,
                      title_en: found.title_en ?? a.title_en,
                      title_romaji: found.title_romaji ?? a.title_romaji,
                    }
                  : a;
              })
            );
          });
        }
      } else if (itemsData.some((s) => !s.image_url)) {
        ensureSongImages(itemsData).then((withImages) => {
          if (cancelled) return;
          setSongs((prev) =>
            prev.map((s) => {
              const found = withImages.find((w) => w.song_id === s.song_id);
              return found && found.image_url ? { ...s, image_url: found.image_url } : s;
            })
          );
        });
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const nowLiked = await toggleListLike(id);
    if (nowLiked !== null) {
      setLiked(nowLiked);
      setLikeCount((c) => c + (nowLiked ? 1 : -1));
    }
    setLikeLoading(false);
  };

  if (loading) return <div className={pageStyles.loading}>{t("common.loading")}</div>;
  if (!listInfo)  return <div className={pageStyles.loading}>{t("public.listPrivate")}</div>;

  const isAnimeList = listInfo.list_type === "anime";

  return (
    <div className={pageStyles.outer}>
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>

      {/* 作成者 */}
      {author && (
        <div className={styles.authorRow}>
          <span className={styles.authorLabel}>{t("public.author")}</span>
          <Link to={`/user/${author.id}`} className={styles.authorLink}>
            {author.user_name}
          </Link>
        </div>
      )}

      {/* リスト名 + いいね + X シェア */}
      <div className={styles.titleRow}>
        <h1 className={pageStyles.title}>{listInfo.name}</h1>
        {listInfo.description && (
          <p className={styles.description}>{listInfo.description}</p>
        )}
        <div className={styles.actionRow}>
        <button
          className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ""}`}
          onClick={handleLike}
          disabled={likeLoading}
        >
          {liked ? "❤️" : "🤍"} {likeCount}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${isAnimeList ? "📺" : "🎵"} ${listInfo.name}（${songs.length}${isAnimeList ? "作品" : "曲"}）\n#SONICLIST`)}&url=${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noreferrer"
          className={styles.xShareBtn}
        >
          {t("list.share")}
        </a>
        </div>
      </div>

      {/* アイテム一覧（読み取り専用。曲/アニメで表示を切替） */}
      <div className={styles.songList}>
        {songs.length === 0 ? (
          <p className={styles.empty}>{t("public.noSongs")}</p>
        ) : isAnimeList ? (
          songs.map((item) => {
            const meta = [
              item.release_year
                ? t("search.year.suffix", { year: item.release_year })
                : null,
              valueLabel(SEASON_LABELS, item.release_season, lang) || null
            ].filter(Boolean).join(" ・ ");
            return (
              <div
                key={item.id}
                className={styles.songRow}
                onClick={() => navigate(`/anime/${item.anime_id}`)}
              >
                <div className={styles.thumb}>
                  {item.image_url
                    ? <img src={item.image_url} alt={animeTitle(item, lang)} />
                    : <div className={styles.noImage}>NO IMAGE</div>
                  }
                </div>
                <div className={styles.songInfo}>
                  <div className={styles.songTitle}>{animeTitle(item, lang)}</div>
                  {meta && <div className={styles.songMeta}>{meta}</div>}
                  {item.memo && (
                    <div className={styles.memo}>💬 {item.memo}</div>
                  )}
                  {item.anime_tags?.length > 0 && (
                    <div className={styles.tagRow}>
                      {item.anime_tags.map((tag) => (
                        <span key={tag} className={styles.emotionTag}>{valueLabel(ANIME_TAG_LABELS, tag, lang)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              className={styles.songRow}
              onClick={() => navigate(`/songs/${song.song_id}`)}
            >
              <div className={styles.thumb}>
                {song.image_url
                  ? <img src={song.image_url} alt={songTitle(song, lang)} />
                  : <div className={styles.noImage}>NO IMAGE</div>
                }
              </div>
              <div className={styles.songInfo}>
                <div className={styles.songTitle}>{songTitle(song, lang)}</div>
                <div className={styles.songMeta}>
                  {song.artist || ""}
                  {song.anime_title ? ` ・ ${song.anime_title}` : ""}
                </div>
                {song.memo && (
                  <div className={styles.memo}>💬 {song.memo}</div>
                )}
                {(song.emotion_tags?.length > 0 || song.encounter_type) && (
                  <div className={styles.tagRow}>
                    {song.emotion_tags?.map((tag) => (
                      <span key={tag} className={styles.emotionTag}>{valueLabel(EMOTION_LABELS, tag, lang)}</span>
                    ))}
                    {song.encounter_type && (
                      <span className={styles.emotionTag}>{valueLabel(ENCOUNTER_LABELS, song.encounter_type, lang)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
