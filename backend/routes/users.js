// // import express from "express";
// // import pool from "../db/index.js";

// // const router = express.Router();

// // /* -------------------------------------------------------
// //    GET /api/users/:id  （ユーザー情報取得）
// // ------------------------------------------------------- */
// // router.get("/:id", async (req, res) => {
// //   const { id } = req.params;

// //   try {
// //     const result = await pool.query(
// //       `
// //       SELECT id, user_name, bio, icon_url
// //       FROM users
// //       WHERE id = $1
// //       `,
// //       [id]
// //     );

// //     if (result.rows.length === 0) {
// //       return res.status(404).json({ error: "User not found" });
// //     }

// //     res.json(result.rows[0]);
// //   } catch (err) {
// //     console.error("DB select error:", err);
// //     res.status(500).json({ error: "DB error" });
// //   }
// // });

// // /* -------------------------------------------------------
// //    POST /api/users  （ユーザー登録）
// // ------------------------------------------------------- */
// // router.post("/", async (req, res) => {
// //   const { id, user_name } = req.body;

// //   try {
// //     await pool.query(
// //       `
// //       INSERT INTO users (id, user_name)
// //       VALUES ($1, $2)
// //       `,
// //       [id, user_name]
// //     );

// //     res.json({ message: "User inserted" });
// //   } catch (err) {
// //     console.error("DB insert error:", err);
// //     res.status(500).json({ error: "DB error" });
// //   }
// // });

// // /* -------------------------------------------------------
// //    PATCH /api/users/:id  （ユーザー情報更新）
// // ------------------------------------------------------- */
// // router.patch("/:id", async (req, res) => {
// //   const { id } = req.params;
// //   const { user_name, bio, icon_url } = req.body;

// //   try {
// //     const result = await pool.query(
// //       `
// //       UPDATE users
// //       SET 
// //         user_name = COALESCE($1, user_name),
// //         bio = COALESCE($2, bio),
// //         icon_url = COALESCE($3, icon_url)
// //       WHERE id = $4
// //       RETURNING id, user_name, bio, icon_url
// //       `,
// //       [user_name, bio, icon_url, id]
// //     );

// //     if (result.rows.length === 0) {
// //       return res.status(404).json({ error: "User not found" });
// //     }

// //     res.json(result.rows[0]);
// //   } catch (err) {
// //     console.error("DB update error:", err);
// //     res.status(500).json({ error: "DB error" });
// //   }
// // });

// // export default router;


// import express from "express";
// import pool from "../db/index.js";

// const router = express.Router();

// /* -------------------------------------------------------
//    GET /api/users/me  （自分のユーザー情報取得）
//    ※ Supabase JWT の user.id を使用
// ------------------------------------------------------- */
// router.get("/me", async (req, res) => {
//   const user_id = req.user.id; // ← Supabase JWT

//   try {
//     const result = await pool.query(
//       `
//       SELECT id, user_name, bio, icon_url
//       FROM users
//       WHERE id = $1
//       `,
//       [user_id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("DB select error:", err);
//     res.status(500).json({ error: "DB error" });
//   }
// });

// /* -------------------------------------------------------
//    POST /api/users  （ユーザー登録）
//    ※ Supabase の signUp 後にフロントが呼ぶ
//    ※ user_id は JWT から取得する
// ------------------------------------------------------- */
// router.post("/", async (req, res) => {
//   const user_id = req.user.id; // ← Supabase JWT
//   const { user_name } = req.body;

//   try {
//     await pool.query(
//       `
//       INSERT INTO users (id, user_name)
//       VALUES ($1, $2)
//       `,
//       [user_id, user_name]
//     );

//     res.json({ message: "User inserted" });
//   } catch (err) {
//     console.error("DB insert error:", err);
//     res.status(500).json({ error: "DB error" });
//   }
// });

// /* -------------------------------------------------------
//    PATCH /api/users/me  （自分のユーザー情報更新）
// ------------------------------------------------------- */
// router.patch("/me", async (req, res) => {
//   const user_id = req.user.id; // ← Supabase JWT
//   const { user_name, bio, icon_url } = req.body;

//   try {
//     const result = await pool.query(
//       `
//       UPDATE users
//       SET 
//         user_name = COALESCE($1, user_name),
//         bio = COALESCE($2, bio),
//         icon_url = COALESCE($3, icon_url)
//       WHERE id = $4
//       RETURNING id, user_name, bio, icon_url
//       `,
//       [user_name, bio, icon_url, user_id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("DB update error:", err);
//     res.status(500).json({ error: "DB error" });
//   }
// });

// export default router;


import express from "express";
import pool from "../db/index.js";
import authenticateToken from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------------------
   GET /api/users/me  （自分のユーザー情報取得）
------------------------------------------------------- */
router.get("/me", authenticateToken, async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT id, user_name, bio, icon_url
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("DB select error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

/* -------------------------------------------------------
   POST /api/users  （ユーザー登録）
------------------------------------------------------- */
router.post("/", authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  const { user_name, bio = "", icon_url = "" } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO users (id, user_name, bio, icon_url)
      VALUES ($1, $2, $3, $4)
      `,
      [user_id, user_name, bio, icon_url]
    );

    res.json({ message: "User inserted" });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

/* -------------------------------------------------------
   PATCH /api/users/me  （自分のユーザー情報更新）
------------------------------------------------------- */
router.patch("/me", authenticateToken, async (req, res) => {
  const user_id = req.user.id;
  const { user_name, bio, icon_url } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET 
        user_name = COALESCE($1, user_name),
        bio = COALESCE($2, bio),
        icon_url = COALESCE($3, icon_url)
      WHERE id = $4
      RETURNING id, user_name, bio, icon_url
      `,
      [user_name, bio, icon_url, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("DB update error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
