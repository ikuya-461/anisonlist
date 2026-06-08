import express from "express";
import fetch from "node-fetch";   // ★ 修正：Node で fetch を使えるようにする
import { normalizeText } from "../utils/normalize.js";

const router = express.Router();

// GET /api/image?title=xxx&artist=yyy
router.get("/image", async (req, res) => {
  const { title, artist } = req.query;

  if (!title || !artist) {
    return res.json({ image_url: null });
  }

  // ★ 全角/半角・余分な空白・大文字小文字によるミスマッチを軽減
  const query = encodeURIComponent(`${normalizeText(title)} ${normalizeText(artist)}`);
  const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.json({ image_url: null });
    }

    const artwork = data.results[0].artworkUrl100.replace("100x100", "600x600");

    res.json({ image_url: artwork });
  } catch (err) {
    console.error("iTunes fetch error:", err);
    res.json({ image_url: null });
  }
});

export default router;
