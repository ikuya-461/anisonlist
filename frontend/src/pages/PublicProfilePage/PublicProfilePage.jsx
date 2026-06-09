import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getPublicProfile } from "../../lib/queries/users";
import { getPublicListsByUser } from "../../lib/queries/lists";

import pageStyles from "../DetailPage.module.css";
import styles from "./PublicProfilePage.module.css";

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profileData, listsData] = await Promise.all([
        getPublicProfile(userId),
        getPublicListsByUser(userId),
      ]);

      setProfile(profileData);
      setLists(listsData);
      setLoading(false);
    };

    load();
  }, [userId]);

  if (loading) return <div className={pageStyles.loading}>読み込み中...</div>;
  if (!profile) return <div className={pageStyles.loading}>このプロフィールは非公開または存在しません。</div>;

  return (
    <div className={styles.outer}>
      <button className={pageStyles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      {/* プロフィール */}
      <div className={styles.profileTop}>
        {profile.icon_url ? (
          <img src={profile.icon_url} alt="icon" className={styles.icon} />
        ) : (
          <span className={styles.icon} role="img" aria-label="icon">👤</span>
        )}
        <div>
          <h1 className={styles.name}>{profile.user_name}</h1>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        </div>
      </div>

      {/* 公開リスト一覧 */}
      <h2 className={pageStyles.sectionTitle}>🎵 公開リスト</h2>

      {lists.length === 0 ? (
        <p className={styles.empty}>公開リストはありません。</p>
      ) : (
        <div className={styles.listGrid}>
          {lists.map((list) => (
            <div
              key={list.id}
              className={styles.listCard}
              onClick={() => navigate(`/public/${list.id}`)}
            >
              <div className={styles.thumb}>
                {list.image_url
                  ? <img src={list.image_url} alt={list.name} />
                  : <div className={styles.noImage}>NO SONG</div>
                }
              </div>
              <div className={styles.listName}>{list.name}</div>
              {list.like_count > 0 && (
                <div className={styles.likeCount}>❤️ {list.like_count}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
