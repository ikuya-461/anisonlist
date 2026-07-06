import { getTemplate } from "./templates";
import { EMOTION_LABELS, ANIME_SHARE_TEMPLATE_LABELS, SEASON_LABELS, valueLabel } from "../i18n";
import { songTitle, animeTitle } from "../displayText";

/* =========================================================
   ランキング画像の canvas 描画本体
   - 1080x1350 (4:5) SNS向け固定サイズ
   - 最大10曲。超過分は「+N more」表記
   - AniList/RAWG はCORS非対応のため Netlify Function 経由でロード
     （iTunes/mzstatic はCORS対応なので直接ロード）
   ========================================================= */

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
const MAX_ROWS = 10;

// CORSヘッダーを返さないCDNはプロキシ経由にする
function toLoadableUrl(url) {
  if (!url) return null;
  if (/(\.|\/\/)((s\d\.)?anilist\.co|media\.rawg\.io)/.test(url)) {
    return `/.netlify/functions/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// 幅を超えるテキストを「…」付きで切り詰める
function ellipsize(ctx, text, maxWidth) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   listName: string,
 *   songs: Array,               // 曲 or アニメの配列（itemTypeで解釈を切替）
 *   templateKey: string,
 *   lang: "ja"|"en",
 *   mode?: "ranking"|"list",    // ranking=順位数字あり / list=順位なしの一覧
 *   itemType?: "song"|"anime"   // 行のタイトル/サブテキストの取り出し方
 * }} opts
 */
export async function drawRankingImage(canvas, { listName, songs, templateKey, lang = "ja", mode = "ranking", itemType = "song" }) {
  const isRanking = mode !== "list";
  const isAnime = itemType === "anime";
  const tpl = getTemplate(templateKey);
  const ctx = canvas.getContext("2d");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  // Webフォント（Orbitron / Noto Sans JP）を確実に使う
  try { await document.fonts.ready; } catch { /* no-op */ }

  const rows = songs.slice(0, MAX_ROWS);
  const covers = await Promise.all(rows.map((s) => loadImage(toLoadableUrl(s.image_url))));

  /* ---------- 背景 ---------- */
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, tpl.bgTop);
  bg.addColorStop(1, tpl.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  tpl.decorate(ctx, CANVAS_W, CANVAS_H);

  const PAD = 64;

  /* ---------- ヘッダー ---------- */
  // テンプレートラベル（曲/アニメで語彙を切替。配色・装飾は共通）
  const templateLabels = isAnime ? ANIME_SHARE_TEMPLATE_LABELS : EMOTION_LABELS;
  const emotionLabel = templateLabels[tpl.key]?.[lang] ?? templateLabels[tpl.key]?.ja ?? "";
  ctx.textBaseline = "alphabetic";

  // テンプレートラベル（ピル）
  ctx.font = "500 34px 'Noto Sans JP', sans-serif";
  const pillTextW = ctx.measureText(emotionLabel).width;
  const pillH = 60;
  roundRectPath(ctx, PAD, 66, pillTextW + 56, pillH, pillH / 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = tpl.accentSub;
  ctx.fillText(emotionLabel, PAD + 28, 66 + pillH / 2 + 12);

  // リスト名
  ctx.font = "700 64px 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = tpl.accent;
  ctx.shadowBlur = 24;
  ctx.fillText(ellipsize(ctx, listName || "MY RANKING", CANVAS_W - PAD * 2), PAD, 210);
  ctx.shadowBlur = 0;

  // 区切り線
  const lineGrad = ctx.createLinearGradient(PAD, 0, CANVAS_W - PAD, 0);
  lineGrad.addColorStop(0, tpl.accent);
  lineGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(PAD, 240, CANVAS_W - PAD * 2, 3);

  /* ---------- 曲行 ---------- */
  const rowTop = 276;
  const rowH = 96;
  const coverSize = 76;

  rows.forEach((song, i) => {
    const y = rowTop + i * rowH;
    const isTop3 = isRanking && i < 3;

    // 行背景（ランキングのTop3はうっすらアクセント）
    if (isTop3) {
      roundRectPath(ctx, PAD - 12, y, CANVAS_W - (PAD - 12) * 2, rowH - 10, 10);
      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.fill();
    }

    // 順位（リスト形式では描かない）
    if (isRanking) {
      ctx.font = isTop3
        ? "900 52px 'Orbitron', sans-serif"
        : "700 38px 'Orbitron', sans-serif";
      ctx.fillStyle = isTop3 ? tpl.rankColor : "rgba(255,255,255,0.55)";
      ctx.textAlign = "right";
      if (isTop3) { ctx.shadowColor = tpl.accent; ctx.shadowBlur = 16; }
      ctx.fillText(String(i + 1), PAD + 74, y + rowH / 2 + (isTop3 ? 18 : 13));
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }

    // ジャケット（リスト形式は順位ぶん左に詰める）
    const cx = isRanking ? PAD + 100 : PAD;
    const cy = y + (rowH - 10 - coverSize) / 2;
    const img = covers[i];
    ctx.save();
    roundRectPath(ctx, cx, cy, coverSize, coverSize, 8);
    ctx.clip();
    if (img) {
      ctx.drawImage(img, cx, cy, coverSize, coverSize);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(cx, cy, coverSize, coverSize);
      ctx.font = "400 30px 'Noto Sans JP', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(isAnime ? "📺" : "♪", cx + coverSize / 2 - (isAnime ? 16 : 10), cy + coverSize / 2 + 11);
    }
    ctx.restore();

    // タイトル / サブテキスト（曲: 曲名+アーティスト・作品 / アニメ: 作品名+年・シーズン）
    const textX = cx + coverSize + 26;
    const textMax = CANVAS_W - PAD - textX;
    const mainText = isAnime
      ? animeTitle(song, lang)
      : (songTitle(song, lang) || song.title || "");
    const subParts = isAnime
      ? [
          song.release_year ? (lang === "en" ? String(song.release_year) : `${song.release_year}年`) : null,
          valueLabel(SEASON_LABELS, song.release_season, lang) || null
        ].filter(Boolean)
      : [song.artist, song.anime_title || song.game_title].filter(Boolean);

    ctx.font = "700 34px 'Noto Sans JP', sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(ellipsize(ctx, mainText, textMax), textX, y + 40);

    ctx.font = "400 26px 'Noto Sans JP', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(ellipsize(ctx, subParts.join(" ・ "), textMax), textX, y + 76);
  });

  // 超過分の表記
  if (songs.length > MAX_ROWS) {
    ctx.font = "500 28px 'Noto Sans JP', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    const rest = songs.length - MAX_ROWS;
    const moreText = lang === "en"
      ? `+${rest} more ${isAnime ? "anime" : "songs"}`
      : `ほか ${rest} ${isAnime ? "作品" : "曲"}`;
    ctx.fillText(moreText, PAD, rowTop + MAX_ROWS * rowH + 20);
  }

  /* ---------- フッター ---------- */
  ctx.font = "700 30px 'Orbitron', sans-serif";
  ctx.fillStyle = tpl.accent;
  ctx.shadowColor = tpl.accent;
  ctx.shadowBlur = 14;
  ctx.fillText("SONICLIST #1", PAD, CANVAS_H - 56);
  ctx.shadowBlur = 0;
}
