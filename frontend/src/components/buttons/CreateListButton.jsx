import { useState } from "react";
import { createList } from "../../lib/queries/lists";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./CreateListButton.module.css";

export default function CreateListButton({ onCreated }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [listType, setListType] = useState("song"); // song=曲リスト / anime=アニメリスト
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    const result = await createList(name.trim(), listType);
    setLoading(false);

    if (!result) return;

    setName("");
    setListType("song");
    setOpen(false);
    if (onCreated) onCreated();
  };

  if (!open) {
    return (
      <button
        className={styles.openButton}
        onClick={() => setOpen(true)}
      >
        {t("list.createNew")}
      </button>
    );
  }

  return (
    <div className={styles.box}>
      <input
        className={styles.input}
        placeholder={t("list.newNamePh")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* リストの種類（曲 / アニメ） */}
      <div className={styles.typeRow}>
        {["song", "anime"].map((type) => (
          <button
            key={type}
            type="button"
            className={`${styles.typeBtn} ${listType === type ? styles.typeActive : ""}`}
            onClick={() => setListType(type)}
          >
            {t(`list.type.${type}`)}
          </button>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button
          className={styles.button}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? t("list.creating") : t("list.createBtn")}
        </button>

        <button
          className={styles.cancelButton}
          onClick={() => {
            setOpen(false);
            setName("");
          }}
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
