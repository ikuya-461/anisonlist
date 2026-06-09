import { useState, useEffect } from "react";
import { renameList, updateListDescription } from "../../lib/queries/lists";
import styles from "./ListHeader.module.css";

export default function ListHeader({ listId, listInfo, onUpdated }) {
  const [editing, setEditing]           = useState(false);
  const [name, setName]                 = useState(listInfo?.name || "");
  const [desc, setDesc]                 = useState(listInfo?.description || "");
  const [editingDesc, setEditingDesc]   = useState(false);

  useEffect(() => {
    setName(listInfo?.name || "");
    setDesc(listInfo?.description || "");
  }, [listInfo]);

  const saveName = async () => {
    if (!name.trim()) return;
    await renameList(listId, name);
    setEditing(false);
    onUpdated();
  };

  const saveDesc = async () => {
    await updateListDescription(listId, desc);
    setEditingDesc(false);
    onUpdated();
  };

  return (
    <div className={styles.wrapper}>
      {/* リスト名 */}
      {editing ? (
        <div className={styles.editRow}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.editInput}
          />
          <button onClick={saveName} className={styles.saveBtn}>保存</button>
          <button onClick={() => setEditing(false)} className={styles.cancelBtn}>キャンセル</button>
        </div>
      ) : (
        <div className={styles.viewRow}>
          <h2 className={styles.title}>{listInfo?.name}</h2>
          <button onClick={() => setEditing(true)} className={styles.renameBtn}>名前変更</button>
        </div>
      )}

      {/* 公開中のみ：公開ページリンク + X シェア */}
      {listInfo?.is_public && (
        <div className={styles.publicActions}>
          <a
            href={`/public/${listId}`}
            target="_blank"
            rel="noreferrer"
            className={styles.publicPageLink}
          >
            🌐 公開ページを見る
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎵 ${listInfo.name}\n#SONICLIST`)}&url=${encodeURIComponent(`${window.location.origin}/public/${listId}`)}`}
            target="_blank"
            rel="noreferrer"
            className={styles.xShareBtn}
          >
            𝕏 シェア
          </a>
        </div>
      )}

      {/* リスト説明 */}
      {editingDesc ? (
        <div className={styles.descEditRow}>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value.slice(0, 200))}
            className={styles.descTextarea}
            placeholder="リストの説明（200文字以内）"
            maxLength={200}
          />
          <div className={styles.descMeta}>
            <span className={styles.descCount}>{desc.length}/200</span>
            <button onClick={saveDesc} className={styles.saveBtn}>保存</button>
            <button onClick={() => { setEditingDesc(false); setDesc(listInfo?.description || ""); }} className={styles.cancelBtn}>キャンセル</button>
          </div>
        </div>
      ) : (
        <div className={styles.descRow} onClick={() => setEditingDesc(true)}>
          {desc
            ? <p className={styles.desc}>{desc}</p>
            : <p className={styles.descEmpty}>説明を追加...</p>
          }
        </div>
      )}
    </div>
  );
}
