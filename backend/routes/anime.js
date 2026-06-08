import express from "express";
import fetch from "node-fetch";   // ★ Node で fetch を安定して使う
import pool from "../db/index.js";
import { ensureSongImages } from "../utils/songImageCache.js";
import { ensureAnimeImages } from "../utils/animeImageCache.js";
import { normalizeText } from "../utils/normalize.js";

const router = express.Router();

/* -------------------------------------------------------
   ① アニメ一覧
------------------------------------------------------- */
router.get("/", async (req, res) => {
  const { keyword: rawKeyword = "", page = 1 } = req.query;
  const keyword = normalizeText(rawKeyword);

  const limit = 10;
  const offset = (page - 1) * limit;

  const whereSQL = keyword ? "WHERE title_jp ILIKE $1 OR title_en ILIKE $1" : "";
  const params = keyword ? [`%${keyword}%`] : [];

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        title_jp,
        title_en,
        release_year,
        release_season,
        type,
        image_url,
        created_at
      FROM anime
      ${whereSQL}
      ORDER BY release_year DESC, title_jp ASC
      LIMIT ${limit} OFFSET ${offset}
      `,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM anime ${whereSQL}`,
      params
    );

    const animeList = await ensureAnimeImages(pool, result.rows);

    res.json({
      anime: animeList,
      total: Number(countResult.rows[0].total),
      page: Number(page),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (err) {
    console.error("anime.js GET error:", err);
    res.status(500).json({ error: "Failed to fetch anime list" });
  }
});

/* -------------------------------------------------------
   ② アニメ画像取得（キャッシュ対応）
------------------------------------------------------- */
router.get("/image/search", async (req, res) => {
  const title = req.query.title;
  if (!title) return res.json({ image_url: null });

  try {
    // 1. DB キャッシュ確認
    const cacheCheck = await pool.query(
      `SELECT image_url FROM anime WHERE title_jp = $1 LIMIT 1`,
      [title]
    );

    if (cacheCheck.rows.length > 0 && cacheCheck.rows[0].image_url) {
      return res.json({ image_url: cacheCheck.rows[0].image_url });
    }

    // 2. Jikan API で検索（全角/半角・余分な空白によるミスマッチを軽減）
    const jikanRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(normalizeText(title))}&limit=1`
    );

    const data = await jikanRes.json();

    const image =
      data?.data?.[0]?.images?.jpg?.large_image_url ||
      data?.data?.[0]?.images?.jpg?.image_url ||
      null;

    // 3. キャッシュ保存
    if (image) {
      await pool.query(
        `UPDATE anime SET image_url = $1 WHERE title_jp = $2`,
        [image, title]
      );
    }

    res.json({ image_url: image });

  } catch (err) {
    console.error("anime.js image error:", err);
    res.json({ image_url: null });  // ★ HTML を返さない → Unexpected token '<' を防ぐ
  }
});

/* -------------------------------------------------------
   ③ アニメ詳細（基本情報）
------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        title_jp,
        title_en,
        release_year,
        release_season,
        type,
        image_url,
        created_at
      FROM anime
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Anime not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("anime.js detail error:", err);
    res.status(500).json({ error: "Failed to fetch anime detail" });
  }
});

/* -------------------------------------------------------
   ④ アニメ詳細 + 曲一覧（AnimeDetail API）
------------------------------------------------------- */
router.get("/:id/detail", async (req, res) => {
  const { id } = req.params;

  try {
    const animeResult = await pool.query(
      `
      SELECT 
        id,
        title_jp,
        title_en,
        release_year,
        release_season,
        type,
        image_url,
        created_at
      FROM anime
      WHERE id = $1
      `,
      [id]
    );

    if (animeResult.rows.length === 0) {
      return res.status(404).json({ error: "Anime not found" });
    }

    const anime = animeResult.rows[0];

    const songsResult = await pool.query(
      `
      SELECT
        s.id AS song_id,
        s.song_title,
        s.song_type,
        s.image_url,
        ar.name AS artist
      FROM songs s
      LEFT JOIN artists ar ON s.artist_id = ar.id
      WHERE s.anime_id = $1
      ORDER BY s.song_type, s.id
      `,
      [id]
    );

    const songs = await ensureSongImages(pool, songsResult.rows);

    res.json({
      anime,
      songs
    });

  } catch (err) {
    console.error("AnimeDetail error:", err);
    res.status(500).json({ error: "Failed to fetch anime detail with songs" });
  }
});

export default router;
