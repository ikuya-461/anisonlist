# デプロイと運用

## 1. 本番環境

| 項目 | 値 |
|---|---|
| URL | https://soniclist.app |
| ホスティング | Netlify（プロジェクト名 `soniclist1`） |
| ビルド元 | GitHub `main` ブランチ（自動公開 ON） |
| DB / 認証 / ストレージ | Supabase（アプリは HTTPS の API で接続。東京リージョンの Pooler を使うのは psql での DB 作業のみ） |
| ドメイン | `soniclist.app`（Netlify DNS、Let's Encrypt で HTTPS） |

URL の変遷：`magenta-crepe-91371f.netlify.app` → `soniclist1.netlify.app` → `soniclist.app`（2026-07-07）。独自ドメインにしたのは、AdSense 審査で無料の共有サブドメインが通りにくいため。

## 2. ローカル開発

```bash
cd frontend
npm install
npm start          # http://localhost:3000
```

```bash
CI=true npm run build   # Netlify と同じく警告をエラー扱いにしてビルド
```

```bash
npm test           # 現状は広告まわり 2 スイート・10 件とパスワード再設定 1 スイート・10 件のみ
```

- Node.js は v24.15.0 で動作確認済み。古い Node（v12 など）では起動しない
- `CI=true` を付けるのは、Netlify が警告をエラーとして扱うため。ローカルで通っても本番ビルドで落ちることがある（2026-07-08 に未使用 import で実際に落ちた）

## 3. 環境変数

`frontend/.env`（git 管理外）と Netlify の Environment variables の両方に設定する。CRA の仕様でビルド時に埋め込まれるため、**変更したら再ビルドが必要**。

| 変数 | 必須 | 内容 |
|---|---|---|
| `REACT_APP_SUPABASE_URL` | ○ | Supabase のプロジェクト URL |
| `REACT_APP_SUPABASE_ANON_KEY` | ○ | Supabase の anon キー（公開前提の値） |
| `REACT_APP_RAWG_API_KEY` | — | ゲーム画像・英題の取得。未設定ならどちらも取得しない |
| `REACT_APP_TURNSTILE_SITE_KEY` | — | 未設定時はコード内の本番サイトキーを使う |
| `REACT_APP_ADS_ENABLED` | — | `true` で広告枠を表示。未設定なら非表示 |
| `REACT_APP_ADS_PROVIDER` | — | `adsense` / `placeholder`（既定） |

**本物の広告を出すには `REACT_APP_ADS_ENABLED=true` と `REACT_APP_ADS_PROVIDER=adsense` の両方が必要**。`ENABLED=true` だけだと開発用のダミー枠が出て、`PROVIDER=adsense` だけだと何も出ない。

開発中に広告の見た目だけ確認したいときは、ブラウザで `localStorage.setItem('soniclist:ads-preview', 'true')` を実行して再読み込みする。このフラグは `REACT_APP_ADS_ENABLED` が未設定・空のときに効く（本番でも同じ。本番は `true` を設定しているので影響しない）。

なお、AdSense のスクリプト（`adsbygoogle.js`）は上記の設定に関係なく `public/index.html` で常に読み込まれる（審査コードを兼ねているため）。

`backend/.env` には旧 Express 用の値（`SUPABASE_URL`・`SUPABASE_ANON_KEY`・`PG*` の接続情報・`ALLOWED_ORIGINS`、`PORT` は任意）が入っている。本番では使わず、psql でのマイグレーション適用に PG の接続情報を流用するだけ。

## 4. Netlify の設定（`frontend/netlify.toml`）

| 設定 | 内容 | 理由 |
|---|---|---|
| ビルド | `npm run build` → `build/` を公開 | |
| Functions | `netlify/functions/`（`image-proxy`） | |
| リダイレクト | 全パスを `index.html` へ | SPA のクライアントルーティングのため |
| `index.html` | キャッシュ無効 | OGP をクローラーに確実に届けるため |
| `/static/*` | 1 年キャッシュ | ファイル名にハッシュが付くため |
| 全パス | セキュリティヘッダー | [authentication.md](authentication.md#4-その他の対策) |

## 5. デプロイ手順

1. `CI=true npm run build` がローカルで通ることを確認
2. `main` に push → Netlify が自動ビルド・公開
3. **本番に反映されたことをライブ URL で確認する**（下記）

### 反映確認（必須）

push しただけでは本番に出ていないことがある。

```bash
curl -s https://soniclist.app | grep -o 'main\.[a-f0-9]*\.js'
```

JS ファイル名のハッシュが変わっていれば新しいビルドが公開されている。

### 過去の事故：デプロイ停止に 1 か月気づかなかった

- Netlify の無料枠のビルドクレジットが尽き、本番デプロイが無効化されていた
- 公開中のデプロイは 2026-06-09 のまま止まり、その後の 39 コミットが本番に出ていなかった
- 「push したので反映済み」と報告し続けていた（進捗の誤報告）
- 2026-07-08 のクレジット更新後に手動でビルドを走らせて復旧した

教訓：①リリース作業の前に Netlify の Billing / Usage でクレジット残量を見る。②反映はライブ URL で実測する。③クレジット復活後も、新しい push かトリガーが無いとビルドは走らない。

## 6. データベースの変更手順

マイグレーションツールは使っていない。

1. `backend/supabase/` に SQL を書く
2. `BEGIN; ... ROLLBACK;` で本番に対して挙動・速度（`EXPLAIN ANALYZE`）を確認
3. `psql -f` で適用
4. anon キーで RPC を実際に呼んで確認
5. SQL ファイルをコミット

権限・ポリシーを変えた場合は、本番に適用した後で `migration_security_baseline.sql` も同じ内容に更新する（ここが権限の基準点。ダッシュボードで直接変えた場合も同様）。

詳細と注意点は [database.md](database.md#6-マイグレーション)。

## 7. ネイティブアプリ（未リリース）

`feature/capacitor` ブランチに Capacitor 8 で iOS / Android プロジェクトを生成済み（`appId: com.soniclist.app`、仮）。main への自動デプロイと切り離すため別ブランチにしている。未 push・main から 19 コミット遅れ。main の作業ツリーにも生成物の `frontend/android` `frontend/ios` が未追跡のまま残っているため、誤ってコミットしないよう注意（削除するか `.gitignore` に入れる）。残作業は [ROADMAP.md](../ROADMAP.md) を参照。
