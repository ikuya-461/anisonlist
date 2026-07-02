import { useState } from "react";
import { createList } from "../../lib/queries/lists";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./CreateListButton.module.css";

export default function CreateListButton({ onCreated }) {
  const { t } = useLanguage();
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
