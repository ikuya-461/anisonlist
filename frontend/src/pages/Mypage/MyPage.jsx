import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { getMyLists, toggleListPublic } from "../../lib/queries/lists";
import { getMyProfile, updateMyProfile, toggleProfilePublic, deleteMyAccount } from "../../lib/queries/users";
import { uploadAvatar } from "../../lib/avatarUpload";
import styles from "./MyPage.module.css";

import ListGallery from "../../components/list/ListGallery";
import CreateListButton from "../../components/buttons/CreateListButton";
import { useLanguage } from "../../contexts/LanguageContext";

export default function MyPage({ updateLoginState }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchLists = async () => {
    return getMyLists();
  };

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [bio, setBio] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState("");
  const fileInputRef = useRef(null);

  // アカウント削除（ストア審査要件）
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ① ログイン確認 + プロフィール取得 + リスト一覧取得
  useEffect(() => {
    const load = async () => {
      const profile = await getMyProfile();

      if (!profile) {
        navigate("/login", { replace: true });
        return;
      }

      setUserId(profile.id);
      setUserName(profile.user_name);
      setBio(profile.bio || "");
      setIconUrl(profile.icon_url || "");
      setIsPublic(profile.is_public || false);
      setEditName(profile.user_name);
      setEditBio(profile.bio || "");
      setEditIcon(profile.icon_url || "");

      // ② リスト一覧取得
      setLists(await getMyLists());
      setLoading(false);
    };

    load();
  }, [navigate]);

  // アイコン画像を選択→即アップロード（公開URLをeditIconにセット、保存は別途「保存」で確定）
  const handleIconFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを選び直せるようにリセット
    if (!file) return;

    setIconError("");
    setUploadingIcon(true);
    const url = await uploadAvatar(file);
    setUploadingIcon(false);

    if (!url) {
      setIconError(t("mypage.iconUploadFailed"));
      return;
    }
    setEditIcon(url);
  };

  // ④ プロフィール更新
  const saveProfile = async () => {
    const updated = await updateMyProfile({
      user_name: editName,
      bio: editBio,
      icon_url: editIcon,
    });

    if (!updated) return;

    setUserName(updated.user_name);
    setBio(updated.bio || "");
    setIconUrl(updated.icon_url || "");
    setEditing(false);
  };

  // ⑤ プロフィール公開トグル
  const handleToggleProfilePublic = async () => {
    const next = await toggleProfilePublic(isPublic);
    if (next !== null) setIsPublic(next);
  };

  // ⑥ リスト公開トグル
  const handleToggleListPublic = async (listId, currentValue) => {
    const next = await toggleListPublic(listId, currentValue);
    if (next !== null) {
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, is_public: next } : l))
      );
    }
  };

  // ⑦ ログアウト
  const handleLogout = async () => {
    await supabase.auth.signOut();
    await updateLoginState();
    navigate("/", { replace: true });
  };

  // ⑧ アカウント削除（RPCが全データ削除→セッション破棄）
  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError("");

    const ok = await deleteMyAccount();

    if (!ok) {
      setDeletingAccount(false);
      setDeleteError(t("account.deleteFailed"));
      return;
    }

    await updateLoginState();
    navigate("/", { replace: true });
  };

  if (loading) return <p>{t("common.loading")}</p>;

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
              <span>{t("mypage.lists")}</span>
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

            <div className={styles.iconEditRow}>
              {editIcon ? (
                <img src={editIcon} alt="icon" className={styles.iconPreview} />
              ) : (
                <span className={styles.iconPreview} role="img" aria-label="icon">👤</span>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconFileChange}
                  className={styles.iconFileInput}
                />
                <button
                  type="button"
                  className={styles.iconUploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingIcon}
                >
                  {uploadingIcon ? t("common.saving") : t("mypage.chooseIcon")}
                </button>
                {iconError && <p className={styles.iconError}>{iconError}</p>}
              </div>
            </div>

            <div className={styles.btnRow}>
              <button onClick={saveProfile} className={styles.saveBtn}>
                {t("common.save")}
              </button>
              <button
                onClick={() => setEditing(false)}
                className={styles.cancelBtn}
              >
                {t("common.cancel")}
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
              {t("mypage.editProfile")}
            </button>

            <div className={styles.publicRow}>
              <button
                className={`${styles.toggleBtn} ${isPublic ? styles.toggleBtnOn : ""}`}
                onClick={handleToggleProfilePublic}
              >
                {isPublic ? t("mypage.public") : t("mypage.private")}
              </button>
              {isPublic && (
                <a
                  href={`/user/${userId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.publicLink}
                >
                  {t("mypage.viewPublicProfile")}
                </a>
              )}
            </div>
          </div>
        )}

        {/* ギャラリー（リスト一覧） */}
        <h3 className={styles.galleryTitle}>{t("mypage.gallery")}</h3>

        <ListGallery
          lists={lists}
          setLists={setLists}
          onTogglePublic={handleToggleListPublic}
          onDeleted={async () => {
            setLists(await fetchLists());
          }}
          onReorder={async (newLists) => {
            const fixedLists = newLists.map((l, index) => ({
              ...l,
              position: index,
            }));

            setLists(fixedLists);

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
          onCreated={async () => {
            setLists(await fetchLists());
          }}
        />

        {/* ログアウト */}
        <button onClick={handleLogout} className={styles.logoutBtn}>
          {t("auth.logout")}
        </button>

        {/* アカウント削除（ストア審査要件: アプリ内から削除可能にする） */}
        <button onClick={() => setShowDeleteAccount(true)} className={styles.deleteAccountBtn}>
          {t("account.delete")}
        </button>

        {showDeleteAccount && (
          <div className={styles.deleteOverlay} onClick={() => !deletingAccount && setShowDeleteAccount(false)}>
            <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.deleteTitle}>{t("account.deleteConfirmTitle")}</h3>
              <p className={styles.deleteText}>{t("account.deleteConfirmText")}</p>
              {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
              <div className={styles.deleteBtnRow}>
                <button
                  className={styles.deleteCancelBtn}
                  onClick={() => setShowDeleteAccount(false)}
                  disabled={deletingAccount}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className={styles.deleteConfirmBtn}
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? t("account.deleting") : t("account.deleteConfirm")}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
