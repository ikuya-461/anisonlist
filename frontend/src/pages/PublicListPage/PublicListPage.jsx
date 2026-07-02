import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { getPublicListDetail, getListLikeStatus, toggleListLike } from "../../lib/queries/lists";
import { getListSongs } from "../../lib/queries/listSongs";
import { getPublicProfile } from "../../lib/queries/users";
import { useLanguage } from "../../contexts/LanguageContext";
import { valueLabel, EMOTION_LABELS, ENCOUNTER_LABELS } from "../../lib/i18n";
import { songTitle } from "../../lib/displayText";

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
    const load = async () => {
      const list = await getPublicListDetail(id);
      if (!list) { setLoading(false); return; }

      setListInfo(list);

      const [songsData, likeStatus, authorData] = await Promise.all([
        getListSongs(id),
        getListLikeStatus(id),
        getPublicProfile(list.user_id),
      ]);

      setSongs(songsData);
      setLikeCount(likeStatus.count);
      setLiked(likeStatus.liked);
      setAuthor(authorData);
      setLoading(false);
    };

    load();
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
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎵 ${listInfo.name}（${songs.length}曲）\n#SONICLIST`)}&url=${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noreferrer"
          className={styles.xShareBtn}
        >
          {t("list.share")}
        </a>
        </div>
      </div>

      {/* 曲一覧（読み取り専用） */}
      <div className={styles.songList}>
        {songs.length === 0 ? (
          <p className={styles.empty}>{t("public.noSongs")}</p>
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
