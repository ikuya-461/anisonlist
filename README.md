# 🎼 AnisonList – アニソン検索 & マイリスト管理アプリ

アニメソング（OP/ED/IN）を検索し、自分だけのマイリストを作成・管理できる Web アプリです。

- 🔍 曲検索（曲名 / 歌手名 / アニメ名 / タイプ）
- 🎧 曲詳細ページ（画像・作詞作曲・アニメ情報）
- 📄 マイリスト作成・編集・削除
- ➕ 曲追加 / 🗑️ 削除 / ↕ 並び替え
- 🔐 Supabase Auth によるログイン
- 🗄️ Supabase PostgreSQL によるデータ管理
- 🌐 Netlify デプロイ（Express 廃止 → フロントのみで完結）

---

## 🚀 使用技術

### 🟦 フロントエンド
- React 18（CRA）
- React Router v6
- CSS Modules（全コンポーネント co-location）
- Fetch API
- カスタムフック（`useDetailPage` など）
- DnD Kit（ドラッグ＆ドロップ）

### 🟩 バックエンド（Express → 廃止）
- 2026/06/08 に完全撤廃
- 以降は Supabase（PostgREST）を直接利用

### 🟪 認証 & データベース
- Supabase Auth（メール＋パスワード）
- Supabase PostgreSQL（RLS 有効）
- 外部 API：
  - Jikan API v4（アニメ情報）
  - iTunes Search API（画像キャッシュ）

### 🟧 ホスティング
- Netlify（SPA リダイレクト設定済み）

---

## 🗂️ 主な機能

### 🔍 アニソン検索
- 曲名 / 歌手名 / アニメ名 / タイプ（OP/ED/IN）
- ページネーション
- 検索結果から直接マイリストに追加

### 🎧 曲詳細ページ `/songs/:id`
- 曲画像
- 曲名 / タイプ / シーケンス
- 歌手 / 作詞 / 作曲 / 編曲
- アニメタイトル
- 公開日・曲情報

### 📄 マイリスト機能
- リスト作成 / 削除 / 名前変更
- 曲追加 / 削除
- 並び替え（DnD Kit）
- リスト切り替え

### 🔐 認証（Supabase Auth）
- ログイン / 新規登録 / パスワードリセット
- `supabase.auth.getUser()` によるユーザー取得
- Express 廃止後は `safeFetch` も廃止 → Supabase クエリに一本化

---

## 🗄️ データベース構造（Supabase PostgreSQL）

**songs**
- song_title / artist / anime_title / song_type / image_url / release_date / lyricist / composer / arranger

**lists**
- id / user_id / name / description

**list_songs**
- id / list_id / song_id / position

---

## 📅 開発ログ（Development Log）

### 📅 2026/05/12 – プロジェクト開始・基盤実装

#### 🛠️ 実装内容
- React / Express / Supabase の環境構築、DB 設計
- AnimeThemes API を解析して曲検索機能を実装
- マイリスト機能（曲追加 / 削除 / 並び替え）を実装

#### 🐛 詰まったポイント
- AnimeThemes API の JSON が深くネストされており、必要なデータの取り出しに苦戦
- マイリストの JOIN 結果の整形（`list_songs` ↔ `songs` の結合）に手間取った

---

### 📅 2026/05/25 – Supabase Auth 導入

#### 🛠️ 実装内容
- メール＋パスワードによるログイン / 新規登録 / ログアウトを実装
- 認証トークンを Express に渡す共通関数 `safeFetch` を作成

#### 🐛 詰まったポイント
- Express（`pg` ライブラリ）と Supabase Auth のトークン形式が異なり、認証エラーが多発
- `safeFetch` で `Authorization: Bearer` ヘッダーを統一することで解決

---

### 📅 2026/05/26 – 曲詳細ページ（SongDetail）

#### 🛠️ 実装内容
- `/songs/:id` ルートで曲詳細ページを実装
- 歌手・作詞・作曲・編曲・アニメタイトルを表示

#### 🐛 詰まったポイント
- ルートを `/song/:id` で定義していたため詳細ページに一切遷移できないバグが発生
- API レスポンスが HTML（エラーページ）になっており `JSON parse error (Unexpected token '<')` が出続けた
- `/songs/:id` に統一して解決

---

### 📅 2026/05/27 – UI 改善

#### 🛠️ 実装内容
- `SongCard` / `SongList` / `ListHeader` コンポーネントを整理・分割
- `navigate` を props で引き回していた箇所を `useNavigate` をコンポーネント内で呼ぶ形に修正

---

### 📅 2026/06/05 – Supabase 接続最適化

#### 🛠️ 実装内容
- `pg` の接続先を Pooler（PgBouncer）に変更

#### 🐛 詰まったポイント
- Direct 接続で `ENOTFOUND` / SSL エラーが断続的に発生
- Pooler に切り替えることで接続が安定

---

### 🔥 📅 2026/06/08 – Express 廃止・Supabase 直接利用への全面移行（Netlify 対応）

#### 🎯 目的
- Express バックエンドを完全撤廃
- フロントから Supabase を直接呼び出す構成へ移行
- Netlify で静的サイトとしてデプロイ可能にする

#### 🛠️ 実装内容
- `src/lib/queries/` を新設し、ドメインごとにクエリ関数を分割
  - `songs.js` / `anime.js` / `artists.js` / `lists.js` / `listSongs.js` / `users.js`
- `safeFetch`（Express 用）を全廃
- iTunes / Jikan API の画像キャッシュロジックを `src/lib/imageCache/` に移植
- `netlify.toml` を作成し SPA リダイレクト設定
- Netlify に環境変数（Supabase URL / ANON KEY）を設定しデプロイ成功

#### 🐛 詰まったポイント

**❌ PostgREST PGRST200（FK 制約なし）**
- `Could not find a relationship between 'songs' and 'artists'`
- 原因：Express 時代は生 SQL JOIN を使っていたが、PostgREST は FK 必須
- 対応：`migration_netlify_rls.sql` に FK 追加 SQL を実装（`DO $$ IF NOT EXISTS` ガード付き）

**❌ Jikan API 429 Too Many Requests**
- `Promise.all` による並列リクエストが 3 req/s 制限を突破
- 対応：`for...of` + `await sleep(400ms)` に変更し安定化

---

### 📅 2026/06/09 – 計画的リファクタリング（全 8 ステップ）

#### 🎯 目的
可読性・メンテナンス性・拡張性の向上。`refactoring.md` に計画を書き出し、段階的に実施。

#### 🛠️ Step 1・2・6（★☆☆）低難易度
- コメント / `eslint-disable` の根本対処（`useCallback` による deps 整理など）
- マジックナンバーを `lib/constants.js` に集約
  - `PAGE_SIZE` / `JIKAN_API_BASE` / `ITUNES_SEARCH_API` / `JIKAN_REQUEST_INTERVAL_MS` / `SONG_TYPE_COLORS` / `DND_ACTIVATION_CONSTRAINT`
- `createList` の引数から `userId` を廃止し、内部で `auth.getUser()` を呼ぶ形に統一

#### 🛠️ Step 3–7（★★☆）中難易度
- `calcRange` / `calcTotalPages` ユーティリティを `lib/utils/pagination.js` に切り出し、各クエリに適用
- `SearchSongPublic.jsx` を `SearchSong` の薄いラッパーに統合（`heading` prop で切り替え）
- `saveProfile` → `updateMyProfile()`、INSERT → `createUserProfile()` に統一（クエリ Layer 統一）
- `useDetailPage` カスタムフックを新設し、詳細ページの共通 fetch パターンを抽象化

```js
export function useDetailPage(fetchFn, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await fetchFn(id);
        if (!cancelled) setData(result ?? null);
      } catch (err) { console.error("useDetailPage error:", err); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);
  return { data, loading };
}
```

#### 🛠️ Step 8（★★★）高難易度
- インラインスタイルを CSS Modules に移行
  - `Button` / `ErrorMessage` / `Header` / `Input` / `ListHeader` / `ListSelect` の 6 コンポーネント
- パスワード強度バーの動的背景色をクラス化（`strengthWeak` / `strengthMedium` / `strengthStrong`）

---

### 📅 2026/06/09 – コード品質クリーンアップ

#### 🛠️ P1：バグ修正
- `CreateListButton.module.css` の同名クラス二重定義（`.box` / `.input` / `.button`）を統合

#### 🛠️ P2：死コード削除
- `SearchSongPublic.module.css` 削除（参照ゼロの孤立ファイル）
- `AnimeDetail.module.css` の残骸クラス 7 個を削除
- `MyPage.module.css` の未使用クラス 4 個を削除、参照されていた `.galleryTitle` を追加

#### 🛠️ P3：命名整合・CSS 共通化
- `SongCard.module.css` → `MediaCard.module.css` にリネーム
- `DetailPage.module.css` を新設し、詳細ページ共通スタイルを集約
  - `.outer` / `.backBtn` / `.title` / `.sectionTitle` / `.loading`

---

### 📅 2026/06/09 – ファイル統合・フォルダ構造の全面整理

#### 🛠️ ファイル統合（優先度高）
- `SongList.module.css` の未使用クラス削除・`.listWrapper` を追加（スタイル未適用バグ修正）
- `SearchSongPublic.jsx` を削除 → `Home.jsx` が `SearchSong` を直接使用
- `AnimeCard.jsx` + `ArtistCard.jsx` → `MediaCard.jsx` に統合（`type="anime"|"artist"` prop）

#### 🛠️ ファイル統合・整理（優先度中）
- `supabaseClient.jsx` → `supabaseClient.js`（JSX 不使用ファイルの拡張子修正）
- `ListGalleryItem.jsx` を `ListGallery.jsx` に内包（内部関数 `GalleryItem` として定義）
- `pages/Home/Home.jsx` → `pages/Home.jsx`（単一ファイルのフォルダを解体）
- `pages/LoginRegister/` → `pages/auth/`（フォルダ名を役割に合わせて変更）

#### 🛠️ フォルダ構造の全面整理・CSS co-location

`components/` を役割ベースで再編し、CSS ファイルをコンポーネントと同フォルダに配置：

| 旧パス | 新パス | 内容 |
|--------|--------|------|
| `components/parts/{Button,Input,ErrorMessage,Header}` | `components/ui/` | 汎用 UI パーツ |
| `components/parts/{ListHeader,ListSelect}` + `components/listItem/{SongList,ListGallery,...}` | `components/list/` | リスト操作・表示系 |
| `components/listItem/{MediaCard,SongCard}` | `components/cards/` | カード表示系 |
| `components/inputs/SearchSong` | `components/search/` | 検索 UI |
| `src/CSS/ComponentCSS/*.module.css` | 各コンポーネントと同フォルダ | CSS co-location |
| `src/CSS/PageCSS/*.module.css` | 各ページと同フォルダ | CSS co-location |

`src/CSS/` ディレクトリを完全廃止。コンポーネントの追加・削除時に CSS の見落としが起きない構造に。

---

## 🗺️ ロードマップ

### ✅ MVP（最小リリース版）
現在実装済み、またはリリースに必須の機能セット。

| 機能 | 状態 |
|------|------|
| アニソン検索 | ✅ 完了 |
| リスト作成・編集 | ✅ 完了 |
| YouTube 埋め込み | 🔲 未実装 |
| リスト画像生成 | 🔲 未実装 |
| X（Twitter）投稿 | 🔲 未実装 |
| 曲いいね | 🔲 未実装 |
| リストいいね | 🔲 未実装 |
| リストクローン | 🔲 未実装 |

---

### 🔥 P1 – 今すぐ実装（SNS 拡散・エンゲージメント）

| カテゴリ | 機能 | 概要 |
|----------|------|------|
| SNS 拡散 | **X 投稿機能** | リストや曲を X にシェア |
| SNS 拡散 | **リスト画像生成** | OGP 画像 or Canvas でリスト画像を生成 |
| エンゲージメント | **曲いいね** | 曲単位でいいね・件数表示 |
| エンゲージメント | **リストいいね** | リスト単位でいいね・件数表示 |
| コンテンツ | **YouTube 埋め込み** | 曲詳細ページで MV を再生 |
| UGC | **リストクローン** | 他ユーザーのリストを自分のリストとしてコピー |
| UX | **曲追加時アニメーション** | 追加完了のフィードバック演出 |

---

### 🚀 P2 – サービス成長期に実装

| カテゴリ | 機能 | 概要 |
|----------|------|------|
| 音楽連携 | **Spotify プレイリスト変換** | マイリストを Spotify プレイリストとして出力 |
| 音楽連携 | **Apple Music プレイリスト変換** | 同上（Apple Music 版） |
| DB 拡張 | **ボカロ曲追加** | ボカロジャンルの対応 |
| DB 拡張 | **ゲーム主題歌追加** | ゲーム OP/ED の対応 |
| DB 拡張 | **Vtuber オリジナル曲追加** | Vtuber 曲の対応 |
| 拡散 | **音楽番組風ランキング動画生成** | Canvas / FFMPEG でランキング動画を生成 |

---

### ⚡ P3 – ユーザー増加後に実装

| カテゴリ | 機能 | 概要 |
|----------|------|------|
| カスタマイズ | **リストアイコン画像アップロード** | Supabase Storage を活用 |
| モデレーション | **イメージ違い報告機能** | 画像が誤っている場合の報告フロー |
| 再生 | **リスト連続再生** | YouTube 埋め込みでリスト内の曲を順に再生 |

---

### 🌱 P4 – 将来構想

| カテゴリ | 機能 | 概要 |
|----------|------|------|
| 企画系 | **オタク診断** | 聴いた曲・リストから属性診断 |
| 企画系 | **俺の年表機能** | 年代ごとの「あの頃の曲」を振り返る |
| ランキング | **テーマ縛りランキング** | 「クール系神曲」「泣ける ED」など |
| ランキング | **年代別 / ジャンル別ランキング** | 年代・ジャンルでのトレンド表示 |
| DB 拡張 | **エロゲ主題歌追加** | 成人向けゲーム OP/ED の対応 |

---

## 🏁 現在の完成度

### ✔ 実装済み
- Supabase Auth（ログイン / 新規登録 / パスワードリセット）
- 曲検索・アニメ検索・アーティスト検索（タブ切り替え）
- 曲詳細 / アニメ詳細 / アーティスト詳細ページ
- マイリスト作成・削除・名前変更
- 曲追加・削除・並び替え（ドラッグ＆ドロップ）
- 画像キャッシュ（iTunes / Jikan API）
- Netlify デプロイ（フロントのみ / Supabase 直接接続）
- コードリファクタリング完了（クエリ Layer 統一・カスタムフック・CSS Modules・フォルダ整理）

### 🔧 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | React (CRA) |
| バックエンド | Supabase (PostgREST + RLS) |
| 認証 | Supabase Auth |
| DB | PostgreSQL (Supabase) |
| ホスティング | Netlify |
| 外部 API | Jikan API v4 / iTunes Search API |
