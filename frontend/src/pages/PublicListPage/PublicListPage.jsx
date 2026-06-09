import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { getPublicListDetail, getListLikeStatus, toggleListLike } from "../../lib/queries/lists";
import { getListSongs } from "../../lib/queries/listSongs";
import { getPublicProfile } from "../../lib/queries/users";

import pageStyles from "../DetailPage.module.css";
import styles from "./PublicListPage.module.css";

export default function PublicListPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  if (loading) return <div className={pageStyles.loading}>読み込み中...</div>;
  if (!listInfo)  return <div className={pageStyles.loading}>このリストは非公開または存在しません。</div>;

  return (
    <div className={pageStyles.outer}>
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      {/* 作成者 */}
      {author && (
        <div className={styles.authorRow}>
          <span className={styles.authorLabel}>作成者：</span>
          <Link to={`/user/${author.id}`} className={styles.authorLink}>
            {author.user_name}
          </Link>
        </div>
      )}

      {/* リスト名 + いいね */}
      <div className={styles.titleRow}>
        <h1 className={pageStyles.title}>{listInfo.name}</h1>
        <button
          className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ""}`}
          onClick={handleLike}
          disabled={likeLoading}
        >
          {liked ? "❤️" : "🤍"} {likeCount}
        </button>
      </div>

      {/* 曲一覧（読み取り専用） */}
      <div className={styles.songList}>
        {songs.length === 0 ? (
          <p className={styles.empty}>曲が登録されていません。</p>
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              className={styles.songRow}
              onClick={() => navigate(`/songs/${song.song_id}`)}
            >
              <div className={styles.thumb}>
                {song.image_url
                  ? <img src={song.image_url} alt={song.song_title} />
                  : <div className={styles.noImage}>NO IMAGE</div>
                }
              </div>
              <div className={styles.songInfo}>
                <div className={styles.songTitle}>{song.song_title}</div>
                <div className={styles.songMeta}>
                  {song.artist || ""}
                  {song.anime_title ? ` ・ ${song.anime_title}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
