import express from "express";
import pool from "../db/index.js";
import { normalizeText } from "../utils/normalize.js";
import { ensureSongImages } from "../utils/songImageCache.js";

const router = express.Router();

/* ======================================================
   ① 曲一覧（複合検索 + ページネーション）
====================================================== */
router.get("/", async (req, res) => {
  const {
    keyword: rawKeyword = "",
    artist: rawArtist = "",
    anime: rawAnime = "",
    type = "",
    page = 1
  } = req.query;

  // ★ 全角/半角・空白の表記揺れによるミスマッチを軽減
  const keyword = normalizeText(rawKeyword);
  const artist = normalizeText(rawArtist);
  const anime = normalizeText(rawAnime);

  const limit = 10;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];
  let idx = 1;

  if (keyword) {
    where.push(`s.song_title ILIKE $${idx}`);
    params.push(`%${keyword}%`);
    idx++;
  }

  if (artist) {
    where.push(`ar.name ILIKE $${idx}`);
    params.push(`%${artist}%`);
    idx++;
  }

  if (anime) {
    where.push(`an.title_jp ILIKE $${idx}`);
    params.push(`%${anime}%`);
    idx++;
  }

  if (type) {
    where.push(`s.song_type = $${idx}`);
    params.push(type);
    idx++;
  }

  const whereSQL = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

  const query = `
    SELECT
      s.id,
      s.song_title,
      s.song_type,
      s.image_url,
      ar.name AS artist,
      an.title_jp AS anime_title
    FROM songs s
    LEFT JOIN artists ar ON s.artist_id = ar.id
    LEFT JOIN anime an ON s.anime_id = an.id
    ${whereSQL}
    ORDER BY s.id
    LIMIT ${limit} OFFSET ${offset};
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM songs s
    LEFT JOIN artists ar ON s.artist_id = ar.id
    LEFT JOIN anime an ON s.anime_id = an.id
    ${whereSQL};
  `;

  try {
    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, params);

    const songs = await ensureSongImages(pool, result.rows);

    res.json({
      songs,
      total: Number(countResult.rows[0].total),
      page: Number(page),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });
  } catch (err) {
    console.error("songs GET error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   ② 曲詳細
====================================================== */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.song_title,
        s.song_type,
        s.song_info,
        s.image_url,
        s.anime_id,
        s.artist_id,
        s.lyricist_id,
        s.composer_id,
        s.arranger_id,
        s.created_at,

        an.title_jp AS anime_title,
        an.release_date AS release_date,

        ar.name AS artist,
        lc.name AS lyricist,
        cc.name AS composer,
        ac.name AS arranger

      FROM songs s
      LEFT JOIN anime an ON s.anime_id = an.id
      LEFT JOIN artists ar ON s.artist_id = ar.id
      LEFT JOIN artists lc ON s.lyricist_id = lc.id
      LEFT JOIN artists cc ON s.composer_id = cc.id
      LEFT JOIN artists ac ON s.arranger_id = ac.id
      WHERE s.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("songs detail error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   ③ image_url 保存 API
====================================================== */
router.post("/:id/image", async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;

  try {
    await pool.query(
      "UPDATE songs SET image_url = $1 WHERE id = $2",
      [image_url, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("songs image save error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
