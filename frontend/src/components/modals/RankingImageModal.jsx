import { useEffect, useRef, useState } from "react";
import { RANKING_TEMPLATES } from "../../lib/rankingImage/templates";
import { drawRankingImage } from "../../lib/rankingImage/drawRankingImage";
import { EMOTION_LABELS } from "../../lib/i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./RankingImageModal.module.css";

/* =========================================================
   リストのランキング画像生成モーダル
   - 感情テンプレート9種から手動選択 → canvasプレビュー
   - ダウンロード / Web Share API（対応環境のみ）でSNSへ
   ========================================================= */
export default function RankingImageModal({ listName, songs, onClose }) {
  const { lang, t } = useLanguage();
  const canvasRef = useRef(null);
  const [templateKey, setTemplateKey] = useState(RANKING_TEMPLATES[0].key);
  const [mode, setMode] = useState("ranking"); // ranking=順位あり / list=順位なし
  const [generating, setGenerating] = useState(true);
  const [canShareFile, setCanShareFile] = useState(false);

  // Web Share API（ファイル共有）対応判定
  useEffect(() => {
    const dummy = new File([""], "x.png", { type: "image/png" });
    setCanShareFile(!!(navigator.canShare && navigator.canShare({ files: [dummy] })));
  }, []);

  // テンプレート・形式・言語が変わるたびに再描画
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    drawRankingImage(canvas, { listName, songs, templateKey, lang, mode })
      .catch((err) => console.error("drawRankingImage error:", err))
      .finally(() => { if (!cancelled) setGenerating(false); });
    return () => { cancelled = true; };
  }, [listName, songs, templateKey, lang, mode]);

  const toBlob = () =>
    new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/png"));

  const fileName = `${(listName || "ranking").replace(/[\\/:*?"<>|]/g, "_")}.png`;

  const handleDownload = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      await navigator.share({
        files: [file],
        title: listName,
        text: `🎵 ${listName} #SONICLIST`
      });
    } catch (err) {
      // ユーザーキャンセルは正常系
      if (err?.name !== "AbortError") console.error("share error:", err);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t("ranking.title")}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="close">✕</button>
        </div>

        {/* 形式切替（ランキング / リスト） */}
        <div className={styles.templateLabel}>{t("ranking.modeLabel")}</div>
        <div className={styles.modes}>
          {["ranking", "list"].map((m) => (
            <button
              key={m}
              className={`${styles.modeBtn} ${mode === m ? styles.modeActive : ""}`}
              onClick={() => setMode(m)}
            >
              {t(`ranking.mode.${m}`)}
            </button>
          ))}
        </div>

        {/* テンプレート選択ギャラリー */}
        <div className={styles.templateLabel}>{t("ranking.templateLabel")}</div>
        <div className={styles.templates}>
          {RANKING_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              className={`${styles.templateBtn} ${templateKey === tpl.key ? styles.templateActive : ""}`}
              style={{ "--tpl-accent": tpl.accent, "--tpl-bg": tpl.bgTop }}
              onClick={() => setTemplateKey(tpl.key)}
            >
              {EMOTION_LABELS[tpl.key]?.[lang] ?? tpl.key}
            </button>
          ))}
        </div>

        {/* プレビュー */}
        <div className={styles.previewWrap}>
          <canvas ref={canvasRef} className={styles.preview} />
          {generating && <div className={styles.generating}>{t("ranking.generating")}</div>}
        </div>

        {/* アクション */}
        <div className={styles.actions}>
          <button className={styles.downloadBtn} onClick={handleDownload} disabled={generating}>
            {t("ranking.download")}
          </button>
          {canShareFile && (
            <button className={styles.shareBtn} onClick={handleShare} disabled={generating}>
              {t("ranking.share")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
