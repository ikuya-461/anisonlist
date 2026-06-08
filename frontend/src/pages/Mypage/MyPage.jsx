import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { getMyLists } from "../../lib/queries/lists";
import styles from "../../CSS/PageCSS/MyPage.module.css";

import ListGallery from "../../components/listItem/ListGallery";
import CreateListButton from "../../components/buttons/CreateListButton";

export default function MyPage({ updateLoginState }) {
  const navigate = useNavigate();

  const fetchLists = async () => {
    return getMyLists();
  };

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [bio, setBio] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // -----------------------------
  // ① ログインユーザー取得
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const uid = user.id;
      setUserId(uid);

      // -----------------------------
      // ② プロフィール取得
      // -----------------------------
      const { data: profile } = await supabase
        .from("users")
        .select("user_name, bio, icon_url")
        .eq("id", uid)
        .single();

      if (profile) {
        setUserName(profile.user_name);
        setBio(profile.bio || "");
        setIconUrl(profile.icon_url || "");

        setEditName(profile.user_name);
        setEditBio(profile.bio || "");
        setEditIcon(profile.icon_url || "");
      }

      // -----------------------------
      // ③ リスト一覧取得
      // -----------------------------
      setLists(await fetchLists());
      setLoading(false);
    };

    load();
  }, [navigate]);

  // -----------------------------
  // ④ プロフィール更新
  // -----------------------------
  const saveProfile = async () => {
    const { data, error } = await supabase
      .from("users")
      .update({
        user_name: editName,
        bio: editBio,
        icon_url: editIcon,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("プロフィール更新エラー:", error);
      return;
    }

    setUserName(data.user_name);
    setBio(data.bio);
    setIconUrl(data.icon_url);

    setEditing(false);
  };

  // -----------------------------
  // ⑤ ログアウト
  // -----------------------------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    await updateLoginState();
    navigate("/", { replace: true });
  };

  if (loading) return <p>読み込み中...</p>;

  return (
    <div className={styles.outer}>
      <div className={styles.inner}>

        {/* Instagram風プロフィール */}
        <div className={styles.profileTop}>
          {iconUrl ? (
            <img src={iconUrl} alt="icon" className={styles.icon} />
          ) : (
            <span className={styles.icon} role="img" aria-label="icon">
              👤
            </span>
          )}

          <div className={styles.stats}>
            <div>
              <strong>{lists.length}</strong>
              <span>リスト</span>
            </div>
          </div>
        </div>

        {/* プロフィール情報 */}
        {editing ? (
          <div className={styles.editBox}>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={styles.input}
            />

            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className={styles.textarea}
            />

            <input
              value={editIcon}
              onChange={(e) => setEditIcon(e.target.value)}
              className={styles.input}
            />

            <div className={styles.btnRow}>
              <button onClick={saveProfile} className={styles.saveBtn}>
                保存
              </button>
              <button
                onClick={() => setEditing(false)}
                className={styles.cancelBtn}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.profileInfo}>
            <h2 className={styles.name}>{userName}</h2>
            <p className={styles.bio}>{bio}</p>

            <button
              onClick={() => {
                setEditName(userName);
                setEditBio(bio);
                setEditIcon(iconUrl);
                setEditing(true);
              }}
              className={styles.editBtn}
            >
              プロフィールを編集
            </button>
          </div>
        )}

        {/* ギャラリー（リスト一覧） */}
        <h3 className={styles.galleryTitle}>作品ギャラリー</h3>

        <ListGallery
          lists={lists}
          setLists={setLists}
          onDeleted={async () => {
            setLists(await fetchLists());
          }}
          onReorder={async (newLists) => {
            const fixedLists = newLists.map((l, index) => ({
              ...l,
              position: index,
            }));

            setLists(fixedLists);

            // ★ upsert をやめて update を使う
            for (const l of fixedLists) {
              await supabase
                .from("lists")
                .update({ position: l.position })
                .eq("id", l.id)
                .eq("user_id", userId);
            }
          }}
        />

        <CreateListButton
          userId={userId}
          onCreated={async () => {
            setLists(await fetchLists());
          }}
        />

        {/* ログアウト */}
        <button onClick={handleLogout} className={styles.logoutBtn}>
          ログアウト
        </button>

      </div>
    </div>
  );
}
