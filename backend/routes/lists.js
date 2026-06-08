// import express from "express";
// import pool from "../db/index.js";

// const router = express.Router();

// /* -------------------------------------------------------
//    ★ 新規リスト作成
//    POST /api/lists
// ------------------------------------------------------- */
// router.post("/", async (req, res) => {
//   const { user_id, name } = req.body;

//   try {
//     const result = await pool.query(
//       `INSERT INTO lists (user_id, name)
//         VALUES ($1, $2)
//         RETURNING id, user_id, name, created_at`,
//       [user_id, name]
//     );

//     res.json(result.rows[0]);

//   } catch (err) {
//     console.error("POST /lists error:", err);
//     res.status(500).json({ error: "Failed to create list" });
//   }
// });

// /* -------------------------------------------------------
//    ★ リスト1件取得（リスト名取得）
//    GET /api/lists/detail/:id
// ------------------------------------------------------- */
// router.get("/detail/:id", async (req, res) => {
//   const id = req.params.id;
//   console.log("📘 GET /lists/detail/:id START id =", id);

//   try {
//     const result = await pool.query(
//       `SELECT * FROM lists WHERE id = $1`,
//       [id]
//     );

//     console.log("📘 GET /lists/detail/:id result =", result.rows);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "List not found" });
//     }

//     res.json(result.rows[0]);

//   } catch (err) {
//     console.error("❌ GET /lists/detail/:id ERROR:", err);
//     res.status(500).json({ error: "Failed to fetch list" });
//   }
// });

// /* -------------------------------------------------------
// ★ ユーザーのリスト一覧取得（← これが欠けていた）
// GET /api/lists/:user_id
// ------------------------------------------------------- */
// router.get("/:user_id", async (req, res) => {
//   const { user_id } = req.params;

//   try {
//     const result = await pool.query(
//       `
//       SELECT 
//         l.id,
//         l.user_id,
//         l.name,
//         l.created_at,

//         -- ★ 最新曲の image_url
//         (
//           SELECT s.image_url
//           FROM list_songs ls
//           JOIN songs s ON ls.song_id = s.id
//           WHERE ls.list_id = l.id
//           ORDER BY ls.id DESC
//           LIMIT 1
//         ) AS image_url,

//         -- ★ 最新曲の song_type（OP/ED/IN）
//         (
//           SELECT s.song_type
//           FROM list_songs ls
//           JOIN songs s ON ls.song_id = s.id
//           WHERE ls.list_id = l.id
//           ORDER BY ls.id DESC
//           LIMIT 1
//         ) AS song_type

//       FROM lists l
//       WHERE l.user_id = $1
//       ORDER BY l.created_at ASC
//       `,
//       [user_id]
//     );

//     res.json(result.rows);

//   } catch (err) {
//     console.error("GET /lists/:user_id error:", err);
//     res.status(500).json({ error: "Failed to fetch lists" });
//   }
// });



// /* -------------------------------------------------------
//    ★ リスト情報取得
//    GET /api/lists/info/:listId
// ------------------------------------------------------- */
// router.get("/info/:listId", async (req, res) => {
//   const listId = req.params.listId;

//   try {
//     const result = await pool.query(
//       `SELECT id, user_id, name, created_at FROM lists WHERE id = $1`,
//       [listId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "List not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("lists info error:", err);
//     res.status(500).json({ error: "Failed to fetch list info" });
//   }
// });

// /* -------------------------------------------------------
//    ★ リスト名変更
//    PUT /api/lists/:id
// ------------------------------------------------------- */
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { name } = req.body;

//   if (!name) {
//     return res.status(400).json({ error: "name is required" });
//   }

//   try {
//     const result = await pool.query(
//       `UPDATE lists SET name = $1 WHERE id = $2 RETURNING *`,
//       [name, id]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "List not found" });
//     }

//     res.json({ message: "List renamed", list: result.rows[0] });

//   } catch (err) {
//     console.error("PUT /lists/:id error:", err);
//     res.status(500).json({ error: "Failed to rename list" });
//   }
// });

// /* -------------------------------------------------------
//    ★ リスト削除
//    DELETE /api/lists/:id
// ------------------------------------------------------- */
// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const check = await pool.query(
//       `SELECT * FROM lists WHERE id = $1`,
//       [id]
//     );

//     if (check.rowCount === 0) {
//       return res.status(404).json({ error: "List not found" });
//     }

//     await pool.query(
//       `DELETE FROM list_songs WHERE list_id = $1`,
//       [id]
//     );

//     await pool.query(
//       `DELETE FROM lists WHERE id = $1`,
//       [id]
//     );

//     res.json({ message: "List deleted" });

//   } catch (err) {
//     console.error("DELETE /lists/:id error:", err);
//     res.status(500).json({ error: "Failed to delete list" });
//   }
// });

// export default router;


// backend/routes/lists.js
import express from "express";
import pool from "../db/index.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------------
   🚀 HTML → JSON 防御付きレスポンス
------------------------------------------------------- */
const safeJson = (res, data) => {
  try {
    return res.json(data);
  } catch (err) {
    console.error("❌ JSON 変換エラー:", err);
    return res.status(500).json({ error: "Invalid JSON response" });
  }
};

/* -------------------------------------------------------
   ★ 新規リスト作成
   POST /api/lists
------------------------------------------------------- */
router.post("/", authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  const { name } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO lists (user_id, name)
       VALUES ($1, $2)
       RETURNING id, user_id, name, created_at`,
      [user_id, name]
    );

    return safeJson(res, result.rows[0]);
  } catch (err) {
    console.error("❌ POST /lists error:", err);
    return res.status(500).json({ error: "Failed to create list" });
  }
});

/* -------------------------------------------------------
   ★ リスト1件取得（リスト名取得）
   GET /api/lists/detail/:id
------------------------------------------------------- */
router.get("/detail/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM lists WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "List not found" });
    }

    return safeJson(res, result.rows[0]);
  } catch (err) {
    console.error("❌ GET /lists/detail ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch list" });
  }
});

/* -------------------------------------------------------
   ★ リスト情報取得
   GET /api/lists/info/:id
------------------------------------------------------- */
router.get("/info/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      `SELECT id, user_id, name, created_at FROM lists WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "List not found" });
    }

    return safeJson(res, result.rows[0]);
  } catch (err) {
    console.error("❌ GET /lists/info ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch list info" });
  }
});

/* -------------------------------------------------------
   ★ ユーザーのリスト一覧取得
   GET /api/lists
------------------------------------------------------- */
router.get("/", authenticateToken, async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        l.id,
        l.user_id,
        l.name,
        l.created_at,
        l.position,

        (
          SELECT s.image_url
          FROM list_songs ls
          JOIN songs s ON ls.song_id = s.id
          WHERE ls.list_id = l.id
          ORDER BY ls.position ASC
          LIMIT 1
        ) AS image_url,

        (
          SELECT s.song_type
          FROM list_songs ls
          JOIN songs s ON ls.song_id = s.id
          WHERE ls.list_id = l.id
          ORDER BY ls.position ASC
          LIMIT 1
        ) AS song_type

      FROM lists l
      WHERE l.user_id = $1
      ORDER BY l.position ASC
      `,
      [user_id]
    );

    return safeJson(res, result.rows);
  } catch (err) {
    console.error("❌ GET /lists error:", err);
    return res.status(500).json({ error: "Failed to fetch lists" });
  }
});

/* -------------------------------------------------------
   ★ リスト名変更
   PUT /api/lists/:id
------------------------------------------------------- */
router.put("/:id", authenticateToken, async (req, res) => {
  const listId = req.params.id;
  const user_id = req.user.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const check = await pool.query(
      `SELECT * FROM lists WHERE id = $1 AND user_id = $2`,
      [listId, user_id]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await pool.query(
      `UPDATE lists SET name = $1 WHERE id = $2 RETURNING *`,
      [name, listId]
    );

    return safeJson(res, {
      message: "List renamed",
      list: result.rows[0]
    });
  } catch (err) {
    console.error("❌ PUT /lists/:id error:", err);
    return res.status(500).json({ error: "Failed to rename list" });
  }
});

/* -------------------------------------------------------
   ★ リスト削除
   DELETE /api/lists/:id
------------------------------------------------------- */
router.delete("/:id", authenticateToken, async (req, res) => {
  const listId = req.params.id;
  const user_id = req.user.id;

  try {
    const check = await pool.query(
      `SELECT * FROM lists WHERE id = $1 AND user_id = $2`,
      [listId, user_id]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query(`DELETE FROM list_songs WHERE list_id = $1`, [listId]);
    await pool.query(`DELETE FROM lists WHERE id = $1`, [listId]);

    return safeJson(res, { message: "List deleted" });
  } catch (err) {
    console.error("❌ DELETE /lists/:id error:", err);
    return res.status(500).json({ error: "Failed to delete list" });
  }
});

export default router;
