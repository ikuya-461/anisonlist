import express from "express";
import pool from "../db/index.js";
import { ensureSongImages } from "../utils/songImageCache.js";
import { normalizeText } from "../utils/normalize.js";

const router = express.Router();

/* -------------------------------------------------------
   ① アーティスト一覧取得
------------------------------------------------------- */
router.get("/", async (req, res) => {
  const { keyword: rawKeyword = "", page = 1 } = req.query;
  const keyword = normalizeText(rawKeyword);

  const limit = 10;
  const offset = (page - 1) * limit;

  const whereSQL = keyword ? "WHERE name ILIKE $1" : "";
  const params = keyword ? [`%${keyword}%`] : [];

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        role,
        created_at
      FROM artists
      ${whereSQL}
      ORDER BY id ASC
      LIMIT ${limit} OFFSET ${offset}
      `,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM artists ${whereSQL}`,
      params
    );

    res.json({
      artists: result.rows,
      total: Number(countResult.rows[0].total),
      page: Number(page),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (err) {
    console.error("artists API error:", err);
    res.status(500).json({ error: "Failed to fetch artists" });
  }
});

/* -------------------------------------------------------
   ② アーティスト詳細（必要なら）
------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        role,
        created_at
      FROM artists
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("artist detail error:", err);
    res.status(500).json({ error: "Failed to fetch artist detail" });
  }
});

/* -------------------------------------------------------
   ③ アーティスト詳細 + 担当曲一覧（ArtistDetail API）
------------------------------------------------------- */
router.get("/:id/detail", async (req, res) => {
  const { id } = req.params;

  try {
    const artistResult = await pool.query(
      `SELECT id, name, role, created_at FROM artists WHERE id = $1`,
      [id]
    );

    if (artistResult.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const songsResult = await pool.query(
      `
      SELECT
        s.id AS song_id,
        s.song_title,
        s.song_type,
        s.image_url,
        an.title_jp AS anime_title,
        ar.name AS artist
      FROM songs s
      LEFT JOIN anime an ON s.anime_id = an.id
      LEFT JOIN artists ar ON s.artist_id = ar.id
      WHERE s.artist_id = $1
         OR s.lyricist_id = $1
         OR s.composer_id = $1
         OR s.arranger_id = $1
      ORDER BY s.id
      `,
      [id]
    );

    const songs = await ensureSongImages(pool, songsResult.rows);

    res.json({
      artist: artistResult.rows[0],
      songs
    });

  } catch (err) {
    console.error("ArtistDetail error:", err);
    res.status(500).json({ error: "Failed to fetch artist detail with songs" });
  }
});

export default router;
