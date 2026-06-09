import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./DeleteListButton.module.css";

export default function DeleteListButton({ listId, onDeleted }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Esc キーで閉じる
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const deleteList = async () => {
    setLoading(true);

    // ★ Supabase 直接削除
    const { error } = await supabase
      .from("lists")
      .delete()
      .eq("id", listId);

    setLoading(false);
    setShowModal(false);

    if (error) {
      console.error("削除エラー:", error);
      return;
    }

    if (onDeleted) onDeleted();
  };

  return (
    <>
      {/* 削除ボタン */}
      <button className={styles.deleteBtn} onClick={() => setShowModal(true)}>
        削除
      </button>

      {/* モーダル */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.title}>リストを削除しますか？</h3>
            <p className={styles.text}>この操作は取り消せません。</p>

            <div className={styles.btnRow}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowModal(false)}
              >
                キャンセル
              </button>

              <button
                className={styles.confirmBtn}
                onClick={deleteList}
                disabled={loading}
              >
                {loading ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
