import { useState, useEffect } from "react";
import { renameList } from "../../lib/queries/lists";
import styles from "../../CSS/ComponentCSS/ListHeader.module.css";

export default function ListHeader({ listId, listInfo, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(listInfo?.name || "");

  // listInfo が更新されたら name も同期
  useEffect(() => {
    setName(listInfo?.name || "");
  }, [listInfo]);

  const saveName = async () => {
    if (!name.trim()) return;

    await renameList(listId, name);

    setEditing(false);
    onUpdated();
  };

  return (
    <div className={styles.wrapper}>
      {editing ? (
        <div className={styles.editRow}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.editInput}
          />
          <button onClick={saveName} className={styles.saveBtn}>
            保存
          </button>
          <button onClick={() => setEditing(false)} className={styles.cancelBtn}>
            キャンセル
          </button>
        </div>
      ) : (
        <div className={styles.viewRow}>
          <h2 className={styles.title}>{listInfo?.name}</h2>
          <button onClick={() => setEditing(true)} className={styles.renameBtn}>
            名前変更
          </button>
        </div>
      )}
    </div>
  );
}
