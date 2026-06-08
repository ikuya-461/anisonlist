// import express from "express";
// import pool from "../db/index.js";

// const router = express.Router();

// /* -------------------------------------------------------
//    ★ 複合検索 API
//    GET /api/search/advanced?keyword=...&artist=...&genre=...
// ------------------------------------------------------- */
// router.get("/advanced", async (req, res) => {
//   const {
//     keyword,
//     artist,
//     anime,
//     genre,
//     song_type,
//     year,
//     season
//   } = req.query;

//   let sql = `
//     SELECT 
//       s.id,
//       s.song_title,
//       s.song_type,
//       s.image_url,
//       a.title_jp AS anime_title,
//       a.genre AS anime_genre,
//       a.year AS anime_year,
//       a.season AS anime_season,
//       ar.name AS artist_name
//     FROM songs s
//     LEFT JOIN anime a ON s.anime_id = a.id
//     LEFT JOIN artists ar ON s.artist_id = ar.id
//     WHERE 1=1
//   `;

//   const params = [];

//   // ★ 曲名
//   if (keyword) {
//     params.push(`%${keyword}%`);
//     sql += ` AND s.song_title ILIKE $${params.length}`;
//   }

//   // ★ アーティスト名
//   if (artist) {
//     params.push(`%${artist}%`);
//     sql += ` AND ar.name ILIKE $${params.length}`;
//   }

//   // ★ アニメ名
//   if (anime) {
//     params.push(`%${anime}%`);
//     sql += ` AND a.title_jp ILIKE $${params.length}`;
//   }

//   // ★ アニメジャンル（Anime / OVA / AnimeMovie）
//   if (genre) {
//     params.push(genre);
//     sql += ` AND a.genre = $${params.length}`;
//   }

//   // ★ 曲タイプ（OP/ED/IN）
//   if (song_type) {
//     params.push(song_type);
//     sql += ` AND s.song_type = $${params.length}`;
//   }

//   // ★ 年代
//   if (year) {
//     params.push(Number(year));
//     sql += ` AND a.year = $${params.length}`;
//   }

//   // ★ シーズン（Winter/Spring/Summer/Fall）
//   if (season) {
//     params.push(season);
//     sql += ` AND a.season = $${params.length}`;
//   }

//   sql += ` ORDER BY s.id DESC LIMIT 100`;

//   try {
//     const result = await pool.query(sql, params);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("❌ /api/search/advanced ERROR:", err);
//     res.status(500).json({ error: "Advanced search failed" });
//   }
// });

// export default router;



import express from "express";
import pool from "../db/index.js";

const router = express.Router();

/* -------------------------------------------------------
   ★ 複合検索 API（完全最適化版）
   GET /api/search/advanced?keyword=...&artist=...&genre=...
------------------------------------------------------- */
router.get("/advanced", async (req, res) => {
  const {
    keyword,
    artist,
    anime,
    genre,
    song_type,
    year,
    season,
    page = 1
  } = req.query;

  // ============================
  // 🚀 ページング設定
  // ============================
  const limit = 50;
  const offset = (Number(page) - 1) * limit;

  // ============================
  // 🚀 SQL ベース
  // ============================
  let sql = `
    SELECT 
      s.id,
      s.song_title,
      s.song_type,
      s.image_url,
      a.title_jp AS anime_title,
      a.genre AS anime_genre,
      a.year AS anime_year,
      a.season AS anime_season,
      ar.name AS artist_name
    FROM songs s
    LEFT JOIN anime a ON s.anime_id = a.id
    LEFT JOIN artists ar ON s.artist_id = ar.id
    WHERE 1=1
  `;

  const params = [];

  // ============================
  // 🚀 条件追加（順番を絶対に崩さない）
  // ============================

  if (keyword) {
    params.push(`%${keyword}%`);
    sql += ` AND s.song_title ILIKE $${params.length}`;
  }

  if (artist) {
    params.push(`%${artist}%`);
    sql += ` AND ar.name ILIKE $${params.length}`;
  }

  if (anime) {
    params.push(`%${anime}%`);
    sql += ` AND a.title_jp ILIKE $${params.length}`;
  }

  if (genre) {
    params.push(genre);
    sql += ` AND a.genre = $${params.length}`;
  }

  if (song_type) {
    params.push(song_type);
    sql += ` AND s.song_type = $${params.length}`;
  }

  if (year) {
    params.push(Number(year));
    sql += ` AND a.year = $${params.length}`;
  }

  if (season) {
    params.push(season);
    sql += ` AND a.season = $${params.length}`;
  }

  // ============================
  // 🚀 ORDER + LIMIT + OFFSET
  // ============================
  sql += ` ORDER BY s.id DESC LIMIT ${limit} OFFSET ${offset}`;

  try {
    const result = await pool.query(sql, params);

    // ============================
    // 🚀 JSON 形式を SearchSong と統一
    // ============================
    res.json({
      songs: result.rows,
      page: Number(page),
      totalPages: 9999 // 必要なら COUNT クエリで計算可能
    });

  } catch (err) {
    console.error("❌ /api/search/advanced ERROR:", err);
    res.status(500).json({ error: "Advanced search failed" });
  }
});

export default router;
