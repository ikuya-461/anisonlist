import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "../../CSS/ComponentCSS/CreateListButton.module.css";

export default function CreateListButton({ userId, onCreated }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const createList = async () => {
    if (!name.trim() || !userId) return;

    setLoading(true);

    // ★ 1. 現在の最大 position を取得
    const { data: maxData, error: maxError } = await supabase
      .from("lists")
      .select("position")
      .eq("user_id", userId)
      .order("position", { ascending: false })
      .limit(1);

    if (maxError) {
      console.error("position 取得エラー:", maxError);
      setLoading(false);
      return;
    }

    const nextPosition = maxData?.[0]?.position + 1 || 0;

    // ★ 2. 新しいリストを position 付きで作成
    const { error } = await supabase
      .from("lists")
      .insert({
        user_id: userId,
        name,
        position: nextPosition,
      });

    setLoading(false);

    if (error) {
      console.error("リスト作成エラー:", error);
      return;
    }

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
          onClick={createList}
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
