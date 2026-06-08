import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import pool from "./db/index.js";

// 🔥 起動時に DB 接続テスト
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ DB connection error:", err);
  } else {
    console.log("✅ DB connected:", res.rows[0]);
  }
});

// 🔥 サーバー起動
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
