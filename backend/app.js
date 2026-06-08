import express from "express";
import cors from "cors";

// 認証ミドルウェア
import requireAuth from "./middleware/auth.js";

// 既存ルーター
import usersRouter from "./routes/users.js";
import listsRouter from "./routes/lists.js";
import listSongsRouter from "./routes/list_songs.js";
import searchRouter from "./routes/search.js";
import animeRouter from "./routes/anime.js";
import artistsRouter from "./routes/artists.js";
import songsRouter from "./routes/songs.js";

// ★ 修正：ファイル名を song_image.js に統一
import songImageRouter from "./routes/song_image.js";

const app = express();

app.use(cors());
app.use(express.json());

// -----------------------------
// 認証不要のルート
// -----------------------------

// 曲データ（閲覧は誰でもOK）
app.use("/api/songs", songsRouter);

// 検索（誰でもOK）
app.use("/api/search", searchRouter);

// アニメ情報（誰でもOK）
app.use("/api/anime", animeRouter);

// アーティスト情報（誰でもOK）
app.use("/api/artists", artistsRouter);

// ★ 修正：iTunes ジャケット画像（誰でもOK）
app.use("/api/song", songImageRouter);

// -----------------------------
// 認証が必要なルート（Supabase JWT 検証）
// -----------------------------

// ユーザー情報（プロフィール取得・更新）
app.use("/api/users", requireAuth, usersRouter);

// リスト（作成・取得・削除）
app.use("/api/lists", requireAuth, listsRouter);

// リスト内の曲（追加・削除）
app.use("/api/list-songs", requireAuth, listSongsRouter);

// -----------------------------

export default app;
