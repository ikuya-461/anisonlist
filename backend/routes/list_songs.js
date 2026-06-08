// import express from "express";
// import pool from "../db/index.js";   // ★ ここだけ正しく合わせる

// const router = express.Router();

// /* -------------------------------------------------------
//    ① 曲をリストに追加（position を自動採番）
// ------------------------------------------------------- */
// router.post("/", async (req, res) => {
//   const { list_id, song_id } = req.body;

//   try {
//     const result = await pool.query(
//       `
//       INSERT INTO list_songs (list_id, song_id, position)
//       SELECT $1, $2, COALESCE(MAX(position), -1) + 1
//       FROM list_songs
//       WHERE list_id = $1
//       RETURNING *
//       `,
//       [Number(list_id), Number(song_id)]
//     );

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("list_songs POST error:", err);
//     res.status(500).json({ error: "Failed to add song" });
//   }
// });

// /* -------------------------------------------------------
//    ② リスト内の曲を取得（position で並べる）
// ------------------------------------------------------- */
// router.get("/:listId", async (req, res) => {
//   const listId = Number(req.params.listId);

//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         ls.id AS id,
//         s.id AS song_id,
//         s.song_title,
//         s.song_type,
//         s.song_info,
//         s.release_date,
//         s.image_url,
//         a.title_jp AS anime_title,
//         ar.name AS artist,
//         lc.name AS lyricist,
//         cc.name AS composer,
//         ac.name AS arranger,
//         ls.position
//       FROM list_songs ls
//       JOIN songs s ON ls.song_id = s.id
//       LEFT JOIN anime a ON s.anime_id = a.id
//       LEFT JOIN artists ar ON s.artist_id = ar.id
//       LEFT JOIN artists lc ON s.lyricist_id = lc.id
//       LEFT JOIN artists cc ON s.composer_id = cc.id
//       LEFT JOIN artists ac ON s.arranger_id = ac.id
//       WHERE ls.list_id = $1
//       ORDER BY ls.position ASC
//       `,
//       [listId]
//     );

//     res.json(result.rows);
//   } catch (err) {
//     console.error("list_songs GET error:", err);
//     res.status(500).json({ error: "Failed to fetch songs" });
//   }
// });

// /* -------------------------------------------------------
//    ③ 曲をリストから削除
// ------------------------------------------------------- */
// router.delete("/:id", async (req, res) => {
//   const id = Number(req.params.id);

//   try {
//     await pool.query(`DELETE FROM list_songs WHERE id = $1`, [id]);
//     res.json({ message: "deleted" });
//   } catch (err) {
//     console.error("list_songs DELETE error:", err);
//     res.status(500).json({ error: "Failed to delete song" });
//   }
// });

// /* -------------------------------------------------------
//    ④ 並び替え
// ------------------------------------------------------- */
// router.post("/reorder", async (req, res) => {
//   const { order } = req.body;

//   try {
//     for (const item of order) {
//       await pool.query(
//         `UPDATE list_songs SET position = $1 WHERE id = $2`,
//         [item.position, Number(item.id)]
//       );
//     }

//     res.json({ message: "reordered" });
//   } catch (err) {
//     console.error("list_songs REORDER error:", err);
//     res.status(500).json({ error: "Failed to reorder" });
//   }
// });

// export default router;


// backend/routes/list_songs.js
import express from "express";
import pool from "../db/index.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------------
   ★ リスト内の曲一覧取得（JOIN）
------------------------------------------------------- */
router.get("/:listId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // ★ Supabase JWT
    const listId = req.params.listId;

    // 本人のリストか確認
    const check = await pool.query(
      `SELECT id FROM lists WHERE id = $1 AND user_id = $2`,
      [listId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await pool.query(
      `
      SELECT
        ls.id,
        ls.song_id,
        ls.position,
        s.song_title,
        ar.name AS artist,
        s.song_type,
        s.image_url,
        a.title_jp AS anime_title
      FROM list_songs ls
      JOIN songs s ON ls.song_id = s.id
      LEFT JOIN anime a ON s.anime_id = a.id
      LEFT JOIN artists ar ON s.artist_id = ar.id
      WHERE ls.list_id = $1
      ORDER BY ls.position ASC
      `,
      [listId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /list-songs ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------
   ★ 曲追加
------------------------------------------------------- */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { list_id, song_id } = req.body;

    const check = await pool.query(
      `SELECT id FROM lists WHERE id = $1 AND user_id = $2`,
      [list_id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const posRes = await pool.query(
      `SELECT COALESCE(MAX(position), 0) AS max FROM list_songs WHERE list_id = $1`,
      [list_id]
    );

    const newPos = posRes.rows[0].max + 1;

    const result = await pool.query(
      `
      INSERT INTO list_songs (list_id, song_id, position)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [list_id, song_id, newPos]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ POST /list-songs ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------
   ★ 並び替え保存
------------------------------------------------------- */
router.put("/reorder", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { list_id, order } = req.body;

    const check = await pool.query(
      `SELECT id FROM lists WHERE id = $1 AND user_id = $2`,
      [list_id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // ① ユニーク制約 (list_id, position) との衝突を避けるため、一旦負の仮位置に退避
      for (const item of order) {
        await client.query(
          `UPDATE list_songs SET position = $1 WHERE id = $2 AND list_id = $3`,
          [-(item.position + 1), item.id, list_id]
        );
      }

      // ② 本来の position に更新
      for (const item of order) {
        await client.query(
          `UPDATE list_songs SET position = $1 WHERE id = $2 AND list_id = $3`,
          [item.position, item.id, list_id]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ PUT /list-songs/reorder ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* -------------------------------------------------------
   ★ 曲削除
------------------------------------------------------- */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const listSongId = req.params.id;

    const check = await pool.query(
      `
      SELECT ls.list_id
      FROM list_songs ls
      JOIN lists l ON ls.list_id = l.id
      WHERE ls.id = $1 AND l.user_id = $2
      `,
      [listSongId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query(`DELETE FROM list_songs WHERE id = $1`, [listSongId]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /list-songs ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
