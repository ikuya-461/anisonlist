import { useState } from "react";
import { createList } from "../../lib/queries/lists";
import styles from "./CreateListButton.module.css";

export default function CreateListButton({ onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    const result = await createList(name.trim());
    setLoading(false);

    if (!result) return;

    setName("");
    setOpen(false);
    if (onCreated) onCreated();
  };

  if (!open) {
    return (
      <button
        className={styles.openButton}
        onClick={() => setOpen(true)}
      >
        ＋ 新しいリストを作成
      </button>
    );
  }

  return (
    <div className={styles.box}>
      <input
        className={styles.input}
        placeholder="新しいリスト名"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className={styles.btnRow}>
        <button
          className={styles.button}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "作成中..." : "作成"}
        </button>

        <button
          className={styles.cancelButton}
          onClick={() => {
            setOpen(false);
            setName("");
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
