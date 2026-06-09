import { useState } from "react";
import styles from "./AddSongModal.module.css";

const EMOTION_OPTIONS = [
  { value: "god",          label: "✨ 神曲" },
  { value: "cry",          label: "😭 泣ける" },
  { value: "hype",         label: "🔥 熱い" },
  { value: "nostalgic",    label: "🕰️ エモい" },
  { value: "life_changing",label: "💊 人生変わった" },
];

const ENCOUNTER_OPTIONS = [
  { value: "anime",        label: "📺 アニメを見て" },
  { value: "niconico",     label: "🎵 ニコニコ動画" },
  { value: "sns",          label: "📱 SNS（X/TikTok）" },
  { value: "friend",       label: "👥 友人に教えてもらった" },
  { value: "rhythm_game",  label: "🎮 音ゲー" },
  { value: "karaoke",      label: "🎤 カラオケ" },
  { value: "random",       label: "🔀 たまたま流れてきた" },
];

export default function AddSongModal({ song, onSave, onSkip }) {
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
          ＋ {song.title || song.song_title}
        </div>
        <p className={styles.sub}>追加しました！タグをつけますか？</p>

        {/* 感情タグ */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>この曲は？</div>
          <div className={styles.tagRow}>
            {EMOTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.tag} ${emotionTags.includes(opt.value) ? styles.tagSelected : ""}`}
                onClick={() => toggleEmotion(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 出会い方 */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>どこで知った？</div>
          <div className={styles.tagRow}>
            {ENCOUNTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.tag} ${encounter === opt.value ? styles.tagSelected : ""}`}
                onClick={() => setEncounter((prev) => prev === opt.value ? "" : opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 一言メモ */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>一言メモ（任意）</div>
          <div className={styles.memoWrapper}>
            <input
              className={styles.memoInput}
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 30))}
              placeholder="例：厨二病が悪化した神曲"
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
            スキップ
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
