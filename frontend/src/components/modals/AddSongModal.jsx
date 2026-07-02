import { useState } from "react";
import styles from "./AddSongModal.module.css";
import { useLanguage } from "../../contexts/LanguageContext";
import { EMOTION_LABELS, ENCOUNTER_OPTION_LABELS } from "../../lib/i18n";
import { songTitle } from "../../lib/displayText";

const EMOTION_KEYS = Object.keys(EMOTION_LABELS);
const ENCOUNTER_KEYS = Object.keys(ENCOUNTER_OPTION_LABELS);

export default function AddSongModal({ song, onSave, onSkip }) {
  const { lang, t } = useLanguage();
  const [memo, setMemo]               = useState("");
  const [emotionTags, setEmotionTags] = useState([]);
  const [encounter, setEncounter]     = useState("");

  const toggleEmotion = (val) => {
    setEmotionTags((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleSave = () => {
    onSave({
      memo:           memo.trim() || null,
      emotion_tags:   emotionTags.length ? emotionTags : null,
      encounter_type: encounter || null,
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* 曲名 */}
        <div className={styles.songName}>
          {t("modal.added", { title: songTitle(song, lang) })}
        </div>
        <p className={styles.sub}>{t("modal.sub")}</p>

        {/* 感情タグ */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>{t("modal.emotionLabel")}</div>
          <div className={styles.tagRow}>
            {EMOTION_KEYS.map((key) => (
              <button
                key={key}
                className={`${styles.tag} ${emotionTags.includes(key) ? styles.tagSelected : ""}`}
                onClick={() => toggleEmotion(key)}
              >
                {EMOTION_LABELS[key][lang] ?? EMOTION_LABELS[key].ja}
              </button>
            ))}
          </div>
        </div>

        {/* 出会い方 */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>{t("modal.encounterLabel")}</div>
          <div className={styles.tagRow}>
            {ENCOUNTER_KEYS.map((key) => (
              <button
                key={key}
                className={`${styles.tag} ${encounter === key ? styles.tagSelected : ""}`}
                onClick={() => setEncounter((prev) => prev === key ? "" : key)}
              >
                {ENCOUNTER_OPTION_LABELS[key][lang] ?? ENCOUNTER_OPTION_LABELS[key].ja}
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
