/* =========================================================
   ランキング画像の感情テンプレート定義（9種）
   - 既存の emotion_tags（i18n.js の EMOTION_LABELS）と1対1対応
   - 各テンプレートは配色と背景装飾（decorate関数）を持つ
   - decorate(ctx, w, h) は背景塗りの直後に呼ばれる
   ========================================================= */

/* 疑似乱数（seed固定で毎回同じ装飾配置にする。プレビューのチラつき防止） */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const RANKING_TEMPLATES = [
  {
    key: "god",
    accent: "#FFD700",
    accentSub: "#FFF6C9",
    bgTop: "#1a1400",
    bgBottom: "#080810",
    rankColor: "#FFD700",
    // 放射する光線
    decorate(ctx, w, h) {
      const rand = seededRandom(7);
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#FFD700";
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24 + rand() * 0.1;
        ctx.lineWidth = 20 + rand() * 40;
        ctx.beginPath();
        ctx.moveTo(w / 2, -100);
        ctx.lineTo(w / 2 + Math.cos(angle) * w * 1.5, -100 + Math.sin(angle) * h * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    key: "cry",
    accent: "#6FA8DC",
    accentSub: "#C9DAF8",
    bgTop: "#0a1230",
    bgBottom: "#060612",
    rankColor: "#9FC5E8",
    // 雨の縦線
    decorate(ctx, w, h) {
      const rand = seededRandom(11);
      ctx.save();
      ctx.strokeStyle = "#6FA8DC";
      for (let i = 0; i < 70; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const len = 40 + rand() * 90;
        ctx.globalAlpha = 0.05 + rand() * 0.1;
        ctx.lineWidth = 1 + rand() * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + len);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    key: "hype",
    accent: "#FF4E1A",
    accentSub: "#FFC38A",
    bgTop: "#2a0800",
    bgBottom: "#0a0208",
    rankColor: "#FF6B35",
    // 下から立ち上る炎風の三角
    decorate(ctx, w, h) {
      const rand = seededRandom(13);
      ctx.save();
      for (let i = 0; i < 26; i++) {
        const x = rand() * w;
        const base = h - rand() * h * 0.35;
        const fh = 80 + rand() * 260;
        const fw = 30 + rand() * 70;
        ctx.globalAlpha = 0.05 + rand() * 0.08;
        ctx.fillStyle = rand() > 0.5 ? "#FF4E1A" : "#FFB800";
        ctx.beginPath();
        ctx.moveTo(x - fw / 2, base);
        ctx.quadraticCurveTo(x - fw * 0.2, base - fh * 0.6, x, base - fh);
        ctx.quadraticCurveTo(x + fw * 0.2, base - fh * 0.6, x + fw / 2, base);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  },
  {
    key: "nostalgic",
    accent: "#C9A66B",
    accentSub: "#EFE0C3",
    bgTop: "#241a10",
    bgBottom: "#0f0a06",
    rankColor: "#D8BC8A",
    // フィルム粒子 + 横縞
    decorate(ctx, w, h) {
      const rand = seededRandom(17);
      ctx.save();
      ctx.fillStyle = "#EFE0C3";
      for (let i = 0; i < 320; i++) {
        ctx.globalAlpha = 0.02 + rand() * 0.06;
        ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
      }
      ctx.globalAlpha = 0.04;
      for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 1);
      ctx.restore();
    }
  },
  {
    key: "life_changing",
    accent: "#AA55FF",
    accentSub: "#E3C7FF",
    bgTop: "#1b0830",
    bgBottom: "#08040f",
    rankColor: "#C58AFF",
    // 中央から広がる同心円 + ビネット
    decorate(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = "#AA55FF";
      for (let r = 120; r < Math.max(w, h); r += 120) {
        ctx.globalAlpha = 0.06;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  },
  {
    key: "night_listen",
    accent: "#7B9FFF",
    accentSub: "#DCE6FF",
    bgTop: "#0c1338",
    bgBottom: "#05060f",
    rankColor: "#9FB6FF",
    // 星空 + 三日月
    decorate(ctx, w, h) {
      const rand = seededRandom(23);
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < 130; i++) {
        ctx.globalAlpha = 0.15 + rand() * 0.5;
        const size = rand() > 0.92 ? 3 : 1.5;
        ctx.fillRect(rand() * w, rand() * h, size, size);
      }
      // 三日月（右上）
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#F5E9C9";
      ctx.beginPath();
      ctx.arc(w - 110, 130, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(w - 92, 118, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    key: "work_bgm",
    accent: "#9AA5B1",
    accentSub: "#E2E8F0",
    bgTop: "#171a1e",
    bgBottom: "#0b0d10",
    rankColor: "#B8C2CC",
    // ミニマルな罫線グリッド
    decorate(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = "#9AA5B1";
      ctx.globalAlpha = 0.06;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 90) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 90) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    key: "chuunibyou",
    accent: "#B11226",
    accentSub: "#FF8FA0",
    bgTop: "#16060a",
    bgBottom: "#050203",
    rankColor: "#E03A4E",
    // 斜めのグリッチバー + 魔法陣風の円
    decorate(ctx, w, h) {
      const rand = seededRandom(31);
      ctx.save();
      ctx.fillStyle = "#B11226";
      for (let i = 0; i < 16; i++) {
        ctx.globalAlpha = 0.05 + rand() * 0.08;
        const y = rand() * h;
        ctx.save();
        ctx.translate(w / 2, y);
        ctx.rotate(-0.12);
        ctx.fillRect(-w, 0, w * 2, 4 + rand() * 20);
        ctx.restore();
      }
      // 魔法陣風（左下）
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "#E03A4E";
      ctx.lineWidth = 2;
      const cx = 90, cy = h - 90;
      [70, 52, 30].forEach((r) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      });
      for (let i = 0; i < 6; i++) {
        const a1 = (Math.PI * 2 * i) / 6;
        const a2 = (Math.PI * 2 * (i + 2)) / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * 70, cy + Math.sin(a1) * 70);
        ctx.lineTo(cx + Math.cos(a2) * 70, cy + Math.sin(a2) * 70);
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    key: "lyrics_insane",
    accent: "#39FF14",
    accentSub: "#CFFFC2",
    bgTop: "#03150a",
    bgBottom: "#020806",
    rankColor: "#5CFF3D",
    // 端末風のノイズ行 + カーソルブロック
    decorate(ctx, w, h) {
      const rand = seededRandom(41);
      ctx.save();
      ctx.fillStyle = "#39FF14";
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.04 + rand() * 0.06;
        const y = rand() * h;
        const bw = 20 + rand() * 180;
        ctx.fillRect(rand() * w, y, bw, 3);
      }
      for (let i = 0; i < 12; i++) {
        ctx.globalAlpha = 0.12;
        ctx.fillRect(rand() * w, rand() * h, 10, 16);
      }
      ctx.restore();
    }
  }
];

export function getTemplate(key) {
  return RANKING_TEMPLATES.find((t) => t.key === key) ?? RANKING_TEMPLATES[0];
}
