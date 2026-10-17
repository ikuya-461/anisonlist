# API 設計

SONICLIST には自前の API サーバーが無い。フロントエンドが次の 3 種類を直接呼ぶ。

1. **Supabase**（PostgREST・RPC・Auth・Storage）— アプリのデータ
2. **外部 API**（iTunes / AniList / RAWG / MusicBrainz）— 画像と英語表記の取得
3. **Netlify Function**（`image-proxy`）— 画像の CORS 中継

> `backend/`（Express）は 2026-06-08 に廃止済みで、本番では動いていない。参照用に残っているだけで、フロントからは一切呼ばれない。

## 1. クエリ層（`frontend/src/lib/queries/`）

画面コンポーネントは原則として Supabase を直接触らず、ドメインごとのクエリ関数を経由する。

| ファイル | 主な関数 |
|---|---|
| `songs.js` | `searchSongs`（RPC）, `getSongDetail`, `updateYoutubeId` |
| `anime.js` | `searchAnime`（RPC）, `getAnimeDetail`, `getAnimeImage` |
| `artists.js` | `searchArtists`（RPC）, `getArtistDetail`（担当曲を 30 件ずつページング） |
| `games.js` | `searchGames`, `getGameDetail` |
| `lists.js` | `createList`, `getMyLists`, `renameList`, `deleteList`（**未使用**）, `toggleListPublic`, `toggleListLike`, `getPublicListDetail`, `getPublicListsByUser` |
| `listSongs.js` | `getListSongs`, `addSongToList`, `reorderListSongs`（RPC）, `removeSongFromList` |
| `listAnime.js` | `getListAnime`, `addAnimeToList`, `reorderListAnime`（RPC）, `removeAnimeFromList` |
| `users.js` | `getMyProfile`, `updateMyProfile`, `getPublicProfile`, `toggleProfilePublic`, `deleteMyAccount`（RPC） |

ページングは 1 ページ 10 件（`PAGE_SIZE`）。

**クエリ層を通らない箇所**

| 箇所 | 内容 |
|---|---|
| `components/buttons/DeleteListButton.jsx` | リスト削除を `supabase.from("lists").delete()` で直接実行（`deleteList` を使っていない） |
| `pages/Mypage/MyPage.jsx` | マイページでのリストの並び替えを `lists` の直接 update で実行 |
| `lib/avatarUpload.js` | Storage `avatars` へのアップロード |
| 認証画面（Login / Register / ForgotPassword / ResetPassword） | `supabase.auth.*` を直接呼ぶ。パスワード再設定は `resetPasswordForEmail`（戻り先 `/reset-password`）と `updateUser` |

## 2. 検索 RPC の設計

| RPC | 検索対象 | フィルタ |
|---|---|---|
| `search_songs` | 曲名 | アーティスト名・アニメ名（`title_jp` のみ）・曲タイプ・カテゴリ・年 |
| `search_anime` | `title_jp` / `title_en`（`title_romaji` は対象外） | 放送年・シーズン |
| `search_artists` | `name` | なし |

ゲーム検索（`searchGames`）は RPC 化されておらず、`title_jp` の部分一致（ILIKE）のみ。誤字許容・関連度順・英題での検索は無く、発売年の新しい順に並ぶ。

> **修正済みの退行（2026-07-21〜10-17）**：`search_songs` を誤字許容版（`migration_search_fuzzy.sql`）に書き換えた際、作品名を「アニメ名、無ければゲーム名」で返す `coalesce` が抜け、検索結果でゲーム曲の作品名が空になっていた。2026-10-17 に式を戻して本番に適用した。

### 一致条件と並び順（2026-07-21〜）

```sql
-- 一致：部分一致 OR 3文字以上なら類似度一致（誤字許容）
s.song_title ILIKE '%' || kw || '%'
OR (char_length(kw) >= 3 AND s.song_title % kw)

-- 並び順：前方一致 3.0 > 部分一致 2.0 > 類似度スコア(0〜1)
```

| 判断 | 理由（実測に基づく） |
|---|---|
| 曖昧一致に `similarity(a,b) > 0.3` ではなく `%` 演算子を使う | 関数呼び出しのままだと GIN インデックスが使われず、23 万行の全件走査で約 1 秒かかった。`%` 演算子ならインデックスを使い数 ms |
| 関数定義に `SET pg_trgm.similarity_threshold` を付けない | 付けると SQL 関数がインライン化されず、12 ms → 1,156 ms に悪化した。既定のしきい値は元々 0.3 なので設定不要 |
| 3 文字未満は曖昧一致を無効化 | 「ラブ」のような短い頻出語に `%` を足すと全件走査に落ち、180 ms → 935 ms に悪化した。短い語は従来どおり部分一致のみ |
| 従来の ID 順をやめ関連度順にする | 一番近い候補が上に来ないという不満があったため |

### 既知の限界

文字の一致で比べる方式のため、**ひらがな・カタカナ・漢字の書き換え**は拾えない（例：「らぶらいぶ」で「ラブライブ」、「しんげきのきょじん」で「進撃の巨人」はヒットしない）。1 文字程度の誤字（「進激の巨人」→「進撃の巨人」）は拾える。対応には読み仮名列などの追加が必要。

## 3. 外部 API

| API | 用途 | 認証 | 備考 |
|---|---|---|---|
| iTunes Search API | 曲ジャケット・アーティスト画像 | 不要 | `country=JP`。アーティスト画像は「そのアーティスト名で曲を検索し、一致した曲のジャケット」を使う |
| AniList GraphQL | アニメ画像・英題・ローマ字 | 不要 | Jikan は 504 が頻発し日本語検索にも弱かったため移行 |
| RAWG | ゲーム画像・英題 | API キー | 返るのは英語名のみ。日本語名のゲームは一致しにくく NO IMAGE になりやすい |
| MusicBrainz | アーティストの英語名 | 不要 | 匿名は 1 リクエスト/秒のため、詳細ページで 1 人ずつ取得 |
| YouTube | 曲詳細の動画埋め込み | 不要 | `youtube-nocookie.com` の iframe。動画 ID はログインユーザーが登録 |

採用できた取得結果は DB に書き戻し（キャッシュ）、2 回目以降は API を呼ばない。画面表示はブロックせず、裏で取得して揃い次第差し替える。

**一致しなかった結果は保存しない**。NO IMAGE になった曲や、AniList に英題が無い作品は、表示のたびに API を呼び直す（否定結果のキャッシュ・再試行間隔は未実装）。

### 画像マッチングの規則

すべての種類で共通の「**誤った画像を付けるより NO IMAGE を選ぶ**」方針。

1. 候補を複数取得する（iTunes 10 件、AniList 5 件、RAWG 5 件）。iTunes で曲を探すときは**先頭のアーティスト 1 人だけ**を検索語に入れる
2. タイトル（アーティスト名）を正規化して採点
   - 正規化：NFKC → 空白の連続を 1 つに → 小文字化。曲名はさらに括弧書き・「- xxx」の後置き・feat. 表記・記号を取り除いてから比べる
   - 完全一致 1.0 / 一方が他方を含む 0.85 / それ以外は 2 文字単位の Dice 係数
   - 曲は、歌手名の一方が他方を含めば +0.18（合計が 1 を超えることがある）
   - アニメは日本語名・ローマ字・英題のうち最も高い点を採る
3. 最高点が 0.72 未満なら採用しない
4. アニメは同点の場合 `popularity` の高い候補を採る（2026-07-30〜）

4 は、テストで「ラブライブ!」「けいおん」「かぐや様は告らせたい」が続編・スピンオフの画像になる誤りを見つけたため追加した。部分一致が一律 0.85 なので原作と続編が同点になり、AniList の返す順（人気順ではない）で先に来た方が選ばれていた。閾値の調整では直らない構造の問題だった。

## 4. Netlify Function：`image-proxy`

`/.netlify/functions/image-proxy?url=...`

**目的**：AniList・RAWG の画像 CDN は CORS ヘッダーを返さないため、canvas に描くとシェア画像が書き出せない（canvas 汚染）。この関数が画像を中継して `Access-Control-Allow-Origin: *` を付ける。

**SSRF 対策**：`https` かつ許可ホスト（`*.anilist.co` / `*.rawg.io` / `*.mzstatic.com`）のみ中継し、`Content-Type` が `image/*` 以外は拒否する。

**未対策**：`fetch(target, { redirect: "follow" })` でリダイレクトを自動追従しており、**転送先のホストを再検査していない**。許可ホスト側にオープンリダイレクトがあれば、許可外のホストへ中継できてしまう。`redirect: "manual"` にして転送先を検査し直すのが修正案。

## 5. その他の外部サービス

| サービス | 用途 | 詳細 |
|---|---|---|
| Cloudflare Turnstile | ログイン・新規登録・パスワード再設定の CAPTCHA | [authentication.md](authentication.md) |
| Google AdSense | 広告配信 | [ads.md](ads.md) |
| Spotify / Apple Music / YouTube Music | 未連携（計画のみ） | [music-services.md](music-services.md) |
