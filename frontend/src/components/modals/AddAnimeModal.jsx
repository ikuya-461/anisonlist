import { useState } from "react";
import styles from "./AddSongModal.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { ANIME_TAG_LABELS } from "../../lib/i18n";
import { animeTitle } from "../../lib/displayText";

/* =========================================================
   アニメをリストに追加した直後のタグ付けモーダル
   - AddSongModal と同型（スタイルも流用）。アニメ専用タグ + メモ
   ========================================================= */

const TAG_KEYS = Object.keys(ANIME_TAG_LABELS);

export default function AddAnimeModal({ anime, onSave, onSkip }) {
  const { lang, t } = useLanguage();
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState([]);

  const toggleTag = (val) => {
    setTags((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleSave = () => {
    onSave({
      memo: memo.trim() || null,
      anime_tags: tags.length ? tags : null
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* アニメ名 */}
        <div className={styles.songName}>
          ＋ {animeTitle(anime, lang)}
        </div>
        <p className={styles.sub}>{t("animeModal.sub")}</p>

        {/* アニメタグ */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>{t("animeModal.tagLabel")}</div>
          <div className={styles.tagRow}>
            {TAG_KEYS.map((key) => (
              <button
                key={key}
                className={`${styles.tag} ${tags.includes(key) ? styles.tagSelected : ""}`}
                onClick={() => toggleTag(key)}
              >
                {ANIME_TAG_LABELS[key][lang] ?? ANIME_TAG_LABELS[key].ja}
              </button>
            ))}
          </div>
        </div>

        {/* 一言メモ */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>{t("modal.memoLabel")}</div>
          <div className={styles.memoWrapper}>
            <input
              className={styles.memoInput}
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 30))}
              placeholder={t("modal.memoPh")}
              maxLength={30}
            />
            <span className={`${styles.memoCount} ${memo.length >= 30 ? styles.memoCountOver : ""}`}>
              {memo.length}/30
            </span>
          </div>
        </div>

        {/* ボタン */}
        <div className={styles.btnRow}>
          <button className={styles.skipBtn} onClick={onSkip}>
            {t("modal.skip")}
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {t("modal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
