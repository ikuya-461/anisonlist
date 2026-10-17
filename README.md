# SONICLIST #1

アニソン・ボカロ・VTuber・ゲーム曲を探して、自分だけのリストにまとめて共有できる Web アプリ。

**https://soniclist.app**

- 23 万曲超（アニソン 7.2 万・ボカロ 12.4 万・ゲーム 3.1 万・VTuber 0.5 万）、アニメ 1 万作品・ゲーム 5 千作品・アーティスト 8 万人を収録
- 誤字を許容する検索と関連度順の並び替え（曲・アニメ・アーティスト）
- 曲リスト / アニメリストの作成・並び替え・公開・いいね
- リストをシェア画像（ランキング / リスト形式 × テンプレート 9 種）にして SNS に投稿
- 日本語 / 英語表示

旧名 AnisonList。リポジトリ名 `anisonlist` はその名残。

---

## 主な機能

| 分類 | 機能 |
|---|---|
| 検索 | 曲・アニメ・ゲーム・アーティストのタブ検索。曲はカテゴリ・曲タイプ・年、アニメは放送年・シーズンで絞り込み。曲名・アニメ名・アーティスト名は 3 文字以上なら 1 文字程度の誤字を許容し、前方一致 > 部分一致 > 類似度の順に並べる。ゲームは部分一致のみ |
| 詳細ページ | 曲（ジャケット・作詞作曲編曲・YouTube 埋め込み、未登録なら YouTube 検索へのリンク）、アニメ・ゲーム（収録曲）、アーティスト（担当曲を 30 件ずつ） |
| マイリスト | 曲リスト（感情タグ 9 種・出会いタグ・メモ）/ アニメリスト（作品タグ 9 種・メモ）。タグ・メモは追加時に設定（メモは 30 字まで）。ドラッグで並び替え、公開設定、いいね |
| シェア | シェア画像の生成（1080×1350、上位 10 件まで）、Web Share API での共有（対応端末のみ。公開リストなら URL も同梱）、X 投稿（公開リストのテキストと URL）、サイト共通の OGP |
| アカウント | メールアドレス + パスワードでの登録・ログイン（Cloudflare Turnstile 付き）、アイコン画像のアップロード、公開プロフィール、アカウント削除 |
| 画像・英語表記 | 外部 API から取得し、採用できた結果を DB に保存して全ユーザーで共有 |
| 広告 | Google AdSense（ディスプレイ 3 か所・検索結果のインフィード。密度は低め） |

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19（Create React App）、React Router 7、CSS Modules、@dnd-kit |
| バックエンド | Supabase（PostgreSQL・PostgREST・RPC・Auth・Storage）。自前の API サーバーなし |
| 検索 | pg_trgm（GIN インデックス + `%` 演算子） |
| ホスティング | Netlify（静的配信 + Netlify Functions） |
| 外部 API | iTunes Search / AniList GraphQL / RAWG / MusicBrainz |
| その他 | Cloudflare Turnstile（CAPTCHA）、Google AdSense、canvas（画像生成） |

## 構成

```
ブラウザ（React SPA）
 ├─ Supabase ─────── PostgreSQL（RLS・列単位の権限）/ Auth / Storage / RPC
 ├─ 外部 API ─────── 画像・英語表記を取得して DB にキャッシュ
 └─ Netlify Function ── 画像の CORS 中継（シェア画像の canvas 描画用）
```

API サーバーを持たず、アクセス制御は DB 側（RLS と列単位の GRANT）で行う。詳しくは [docs/architecture.md](docs/architecture.md)。

## 技術的なポイント

**23 万曲の誤字許容検索を数 ms で返す**
pg_trgm で部分一致と類似度一致を組み合わせた。検証の過程で、`similarity()` を条件に書くとインデックスが使われず約 1 秒かかること、関数に類似度しきい値の設定を付けると関数がインライン化されず 12ms → 1,156ms に悪化することを `EXPLAIN ANALYZE` で突き止め、設計に反映した。→ [docs/api.md](docs/api.md#2-検索-rpc-の設計)

**「誤った画像より NO IMAGE」の画像マッチング**
外部 API の候補を類似度で採点し、低ければ採用しない。網羅テスト（アニメ 35 件・アーティスト 26 件）で「原作名で検索すると続編の画像が付く」誤りを見つけ、同点時に人気度で決める方式に直した。→ [docs/api.md](docs/api.md#画像マッチングの規則)

**API サーバー無しでの権限設計**
テーブル単位の読み取り権限は全列に及び、列単位の REVOKE では打ち消せないという Postgres の仕様により、公開プロフィールの生年・性別が第三者から読めていた。テーブル単位の権限を外し、安全な列だけを付け直して塞いだ。→ [docs/authentication.md](docs/authentication.md)

**差し替え可能な広告基盤**
画面は `<AdSlot placement="..." />` を置くだけで広告 SDK を知らない。プロバイダ（AdSense / 開発用ダミー / 将来の AdMob）は設定で切り替え、枠の高さを固定してレイアウトのずれを防ぐ。→ [docs/ads.md](docs/ads.md)

## 既知の制約

主なものを挙げる。全体は [ROADMAP.md](ROADMAP.md#issue-一覧)。

- ひらがな・カタカナ・漢字の読みの違いは検索で吸収できない（「らぶらいぶ」で「ラブライブ」は出ない）
- 広告は有効化済みだが、2026-10-17 時点で実際の配信は無い

## セットアップ

```bash
git clone https://github.com/ikuya-461/anisonlist.git
cd anisonlist/frontend
npm install
```

`frontend/.env` を作成する：

```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=xxxx
REACT_APP_RAWG_API_KEY=xxxx            # 任意：ゲームの画像・英題の取得
REACT_APP_TURNSTILE_SITE_KEY=xxxx      # 任意：未設定なら本番のサイトキーを使う
REACT_APP_ADS_ENABLED=false            # 任意：true で広告枠を表示
REACT_APP_ADS_PROVIDER=placeholder     # 任意：adsense / placeholder
```

```bash
npm start
```

- Node.js v24 で動作確認
- DB スキーマは `backend/supabase/*.sql`。ただし**リポジトリの SQL だけでは DB を構築できない**（初期テーブルの定義が無い）。権限・ポリシーは最後に `migration_security_baseline.sql` を流すと本番と同じになる。詳細は [docs/database.md](docs/database.md#6-マイグレーション)

## ディレクトリ構成

```
anisonlist/
├── frontend/                 Web アプリ本体（Netlify にデプロイ）
│   ├── src/
│   │   ├── pages/            画面（Home 以外はルート単位で遅延読み込み）
│   │   ├── components/       UI（ads / auth / buttons / cards / list / modals / search / ui）
│   │   ├── contexts/         言語・広告の Context
│   │   ├── hooks/            useDetailPage（曲・アニメ・ゲーム詳細の共通取得）
│   │   └── lib/
│   │       ├── queries/      Supabase へのアクセス（原則ここ経由。認証・Storage・一部の削除と並び替えは例外）
│   │       ├── imageCache/   画像・英語表記の取得とキャッシュ
│   │       ├── ads/          広告の設定・プロバイダ・計測
│   │       └── rankingImage/ シェア画像の生成
│   ├── netlify/functions/    image-proxy
│   └── netlify.toml
├── backend/
│   ├── supabase/             マイグレーション・データ投入 SQL
│   └── (routes など)          旧 Express。2026-06-08 に廃止済みで本番未使用
└── docs/                     設計ドキュメント
```

## デプロイ

`main` への push で Netlify が自動ビルドする。push しただけでは反映されないことがあるため（ビルドクレジットの枯渇で約 1 か月止まっていた実例あり）、公開後はライブ URL で反映を確認する。→ [docs/deployment.md](docs/deployment.md)

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 全体構成・技術選定の理由・技術的負債 |
| [docs/database.md](docs/database.md) | テーブル・RPC・インデックス・マイグレーション |
| [docs/api.md](docs/api.md) | クエリ層・検索 RPC・外部 API・画像マッチング |
| [docs/authentication.md](docs/authentication.md) | 認証・権限設計・既知のリスク |
| [docs/deployment.md](docs/deployment.md) | 環境変数・デプロイ手順・運用上の注意 |
| [docs/ads.md](docs/ads.md) | 広告の方針・配置・技術設計・配信状況 |
| [docs/monetization.md](docs/monetization.md) | 収益化の優先順位 |
| [docs/music-services.md](docs/music-services.md) | Spotify / Apple Music / YouTube Music の責務と制約 |
| [docs/spec-history.md](docs/spec-history.md) | 仕様の変遷と変更理由 |
| [CHANGELOG.md](CHANGELOG.md) | 変更履歴 |
| [ROADMAP.md](ROADMAP.md) | 今後の計画・Issue 一覧 |
