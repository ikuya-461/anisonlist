# アーキテクチャ

## 1. 全体構成

```
ブラウザ（React SPA）
 ├─ Supabase ── PostgreSQL（RLS） / Auth / Storage / RPC
 ├─ 外部API ─── iTunes / AniList / RAWG / MusicBrainz（画像・英語表記の取得）
 ├─ Netlify Function ── image-proxy（CORS 非対応 CDN の画像中継）
 ├─ Cloudflare Turnstile（CAPTCHA）
 └─ Google AdSense（広告）

ホスティング：Netlify（main ブランチから自動ビルド）  ドメイン：soniclist.app
```

自前の API サーバーは持たない。フロントエンドから Supabase を直接呼び、アクセス制御は DB 側（RLS・列単位の権限）で行う。

### なぜサーバーを持たないか

| 判断 | 理由 |
|---|---|
| 2026-06-08 に Express を廃止し Supabase 直結へ | Netlify の静的ホスティングだけで動かし、サーバーの運用・費用を無くすため |
| 権限は RLS と列単位 GRANT で守る | API サーバーで検査しない分、DB を最後の砦にする必要がある。画面側には認可の判定がほとんど無い（§6） |
| サーバー処理が必要な箇所だけ Netlify Function | 画像 CORS 中継のみ。Express は本番に存在しないため、そこに足すのではなく Function で実装した（2026-07-04） |

`backend/`（Express）はリポジトリに残っているが本番では動いていない。

## 2. 技術スタック

| 層 | 技術 | 採用理由・備考 |
|---|---|---|
| UI | React 19（Create React App）, React Router 7 | 最初のコミットから React 19 |
| スタイル | CSS Modules（コンポーネントと同じフォルダに配置） | 追加・削除時の CSS 漏れを防ぐ |
| 並び替え | @dnd-kit | CSS Transform による滑らかなアニメーション。並び順の一意制約の衝突は RPC 側で回避している（[database.md](database.md#4-rpcデータベース関数)） |
| データ | Supabase（PostgreSQL + PostgREST + RPC） | |
| 検索 | pg_trgm（GIN インデックス + `%` 演算子） | 23 万曲規模で部分一致・誤字許容を数 ms で返すため |
| 認証 | Supabase Auth（メール + パスワード） + Cloudflare Turnstile | |
| 画像生成 | canvas（1080×1350） | サーバー生成・AI 生成ではなくブラウザ内で完結させる |
| 多言語 | 自作 i18n 辞書（日本語 / 英語） | |
| 広告 | Google AdSense（プロバイダ差し替え可能な自作層） | [ads.md](ads.md) |
| ホスティング | Netlify（静的配信 + Functions） | |
| ネイティブ化 | Capacitor 8（`feature/capacitor` ブランチ、未マージ） | iOS / Android の両方に出せる。TWA は Android 専用のため不採用 |

## 3. フロントエンド構成

```
frontend/src/
├── pages/            画面（Home 以外はルート単位で React.lazy による遅延読み込み）
├── components/
│   ├── ads/          広告枠（AdSlot / AdFrame / AdsenseAd / InFeedAd / PlaceholderAd）
│   ├── auth/         Turnstile
│   ├── buttons/ cards/ list/ modals/ search/ ui/
├── contexts/         LanguageContext（言語） / AdContext（広告設定・会員判定）
├── hooks/            useDetailPage（曲・アニメ・ゲーム詳細の共通取得。アーティスト詳細はページングのため独自実装）
└── lib/
    ├── queries/      Supabase へのアクセス（原則ここ経由。例外は §6）
    ├── imageCache/   外部 API から画像・英語表記を取得し DB に書き戻す
    ├── ads/          広告の設定・プロバイダ・計測・同意・会員判定
    ├── rankingImage/ シェア画像の描画とテンプレート
    ├── i18n.js       翻訳辞書と表示用ラベル
    └── displayText.js 言語に応じたタイトル表示（英語が無ければ日本語に戻す）
```

### ルート

| パス | 画面 | ログイン |
|---|---|---|
| `/` | ホーム（検索。検索結果もこの画面に表示） | 不要 |
| `/songs/:id` `/anime/:id` `/game/:id` `/artist/:id` | 詳細ページ | 不要 |
| `/list/:id` | リスト編集 | 画面側の判定なし（§6） |
| `/public/:id` | 公開リスト（いいねはログイン時のみ） | 不要 |
| `/user/:userId` | 公開プロフィール | 不要 |
| `/mypage` | マイページ | 必要（未ログインは `/login` へ） |
| `/login` `/register` `/forgot-password` | 認証 | — |
| `/reset-password` | 新しいパスワードの設定（再設定メールのリンク先） | 再設定リンクの一時セッションが必要 |
| `/privacy` | プライバシーポリシー | 不要 |

## 4. 主要な処理の流れ

### 検索

`SearchSong` → `lib/queries/*` → 曲・アニメ・アーティストは Supabase RPC（`search_songs` 等）、ゲームはテーブルへの部分一致 → 結果を即表示 → 足りない画像・英語表記を裏で外部 API から取得して差し替え。

画像取得で結果表示を待たせない（2026-07-02 の計測で、遅さの原因は画像取得が表示をブロックしていたことだったため）。

### 画像・英語表記のキャッシュ

1. 必要な列がすべて揃っていれば API を呼ばない（曲・アーティストは画像、アニメは画像・英題・ローマ字、ゲームは画像・英題）
2. 足りなければ外部 API を検索し、類似度スコアで候補を選ぶ（[api.md](api.md#画像マッチングの規則)）
3. **採用できた結果だけ**を DB に書き戻す。以後は全ユーザーが API を呼ばずに済む

一致しなかった結果（NO IMAGE）や、AniList に英題が無い作品は保存されないため、**表示のたびに API を呼び直す**。

補完を行うのは、検索結果・全詳細ページ・自分のリスト・公開リスト。同時実行数は曲・アーティストが 6、アニメ・ゲームが 3。

### シェア画像

リスト画面 → `RankingImageModal` → canvas に描画（ランキング形式 / リスト形式 × テンプレート 9 種、上位 10 件まで）→ 保存、または Web Share API で共有（対応端末のみ。公開リストなら URL も同梱）。CORS 非対応 CDN の画像は `image-proxy` 経由で読み込む。

## 5. 非機能要件

| 項目 | 実装 |
|---|---|
| 表示速度 | ルート単位のコード分割、画像取得の非ブロック化、スケルトン表示、Web フォントを表示を止めずに読み込む（`index.html`。CSS の `@import` に戻すと初回表示が約 5 秒止まる）、ヘッダーロゴは表示の約 3 倍の WebP |
| レイアウトのずれ（CLS） | 広告枠は高さを固定し、読み込み中はスケルトンで同じ高さを確保 |
| セキュリティ | RLS・列単位 GRANT・セキュリティヘッダー・Turnstile・画像プロキシの許可ホスト制限（[authentication.md](authentication.md)） |
| 検索エンジン | サイト共通の OGP / Twitter Card、`robots.txt`（検索エンジン許可・AI 学習クローラ拒否） |
| アクセシビリティ | `prefers-reduced-motion` で広告とスケルトンのアニメーションを停止 |

## 6. 技術的負債

| 項目 | 内容 |
|---|---|
| 画面側の認可 | `/list/:id` にログイン・所有者の判定が無い。他人の公開リストを開くと編集 UI がそのまま出る（書き込みは RLS で失敗する）。非公開リストを開くとスケルトンのまま止まる |
| クエリ層の例外 | リスト削除（`DeleteListButton`）とマイページでのリストの並び替えが Supabase を直接呼んでいる。`lists.js` の `deleteList` は未使用 |
| 自動テスト | 広告まわり 10 件（`lib/ads/__tests__`）・パスワード再設定の入力チェック 10 件（`lib/__tests__`）・アカウント削除 5 件（`lib/queries/__tests__`）のみ。`@testing-library/*` は入っているが使われていない |
| 依存関係 | 未使用：`aws-amplify`・`pg`・`@dnd-kit/modifiers`・`web-vitals`。逆に `@dnd-kit/utilities` は使っているのに `package.json` に無い（他パッケージの依存として偶然入っている） |
| 未使用の定数 | `JIKAN_API_BASE`・`JIKAN_REQUEST_INTERVAL_MS`（Jikan は廃止済み） |
| 失敗結果の再試行 | 画像が見つからなかった結果を保存しないため、同じ曲を表示するたびに外部 API を呼ぶ |
| 残置コード | `backend/`（Express）が本番未使用のまま残っている。ローカルに未コミットの修正（CORS 許可リスト・SSL 検証）がある |
| マイグレーション | 連番・適用記録なし。権限は本番から書き出したベースラインで揃えたが、テーブル定義がリポジトリに無い（[database.md](database.md#6-マイグレーション)） |
| ブランチ | `design/cyberpunk-theme` はマージ済みで不要。`feature/capacitor` は main から 19 コミット遅れ、未 push |
| 生成物 | main の作業ツリーに `frontend/android` `frontend/ios`（未追跡）が残っている |
