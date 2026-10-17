# 認証とセキュリティ

## 1. 認証方式

Supabase Auth のメールアドレス + パスワード認証。

| 画面 | 処理 |
|---|---|
| 新規登録 `/register` | ユーザー名・生年・性別・メール・パスワード・パスワード確認をすべて必須で入力（生年は 1900〜今年）→ `auth.signUp` → `users` にプロフィール作成 |
| ログイン `/login` | `auth.signInWithPassword` |
| パスワード再設定 `/forgot-password` → `/reset-password` | `auth.resetPasswordForEmail`（戻り先 `redirectTo` = `/reset-password`）でメール送信 → リンクを開くと supabase-js が URL のトークンから一時的なログイン状態を作る → 新しいパスワードを入力して `auth.updateUser` → マイページへ。リンクが期限切れ・使用済みなら再送を案内する（2026-10-17〜。それまではメール送信だけで変更できなかった） |
| ログアウト | `auth.signOut` |
| アカウント削除（マイページ） | RPC `delete_my_account()` が本人のいいね・リスト（中身も連鎖削除）・認証情報（プロフィールも連鎖削除）を削除。**Storage のアイコン画像は消えない**（§5） |

**再設定リンクの戻り先**：`redirectTo` の URL は Supabase の Authentication → URL Configuration → Redirect URLs に登録されていないと使われず、Site URL に戻される。その場合でも、アプリ起動時に URL のハッシュの `type=recovery` を見て `/reset-password` へ差し替えるため、Site URL がこのサイトであれば設定画面が開く（`lib/supabaseClient.js`）。確実にするには 👤 Redirect URLs に `https://soniclist.app/reset-password`（開発用に `http://localhost:3000/reset-password`）を登録する。

アカウント削除はアプリ内から行えるようにしてある（Apple App Store 審査ガイドライン 5.1.1(v) の必須要件。2026-07-04）。

**メール確認**：登録処理は「メール確認が OFF」を前提にしており、`signUp` の直後にプロフィールを作る。本番の Supabase も自動確認（`mailer_autoconfirm`）が有効で、プロフィールの無い認証ユーザーは 0 件（2026-10-17 確認）。その代わり、**持っていないメールアドレスでも登録できる**。

## 2. CAPTCHA（Cloudflare Turnstile）

ログイン・新規登録・パスワード再設定の 3 フォームに Turnstile を置き、取得したトークンを Supabase の認証呼び出しに `captchaToken` として渡す。

- 目的：登録スパムと総当たり攻撃の防止（ログイン・新規登録は 2026-07-07。パスワード再設定画面は表示されない不具合があり、実際に出るようになったのは 2026-07-08 の `ede8042` から）
- サイトキーは公開値（`lib/turnstile.js`、環境変数 `REACT_APP_TURNSTILE_SITE_KEY` で上書き可）
- 認証に失敗したらトークンを取り直す（トークンは 1 回限り）
- **Supabase 側の CAPTCHA 必須化はされていない**（2026-10-17 確認：トークン無しのログイン要求が CAPTCHA で止められず、資格情報の照合まで進んだ）。つまり現状、画面の Turnstile は API を直接叩くボットには効いていない
- 有効化の手順：Supabase の Authentication → Bot and Abuse Protection で CAPTCHA を ON にし、Turnstile の Secret Key を登録する（👤）。フロントは本番に反映済みなので、今すぐ有効化しても既存ユーザーはログインできる

## 3. アクセス制御（RLS と列単位の権限）

API サーバーを持たないため、DB の権限が唯一の防御線になる。全 10 テーブルで RLS を有効にしている。

| 対象 | 誰が | 何をできるか |
|---|---|---|
| songs / anime / artists / games / song_artists | 誰でも | 読み取り |
| songs / anime / artists / games（画像・英語表記のキャッシュ） | 未ログイン・ログイン | `image_url` と英語表記の列（`title_en` / `title_romaji` / `name_en`）だけ更新できる（下記）。`song_artists` は更新不可 |
| songs.youtube_id | ログインユーザー | 更新できる |
| lists / list_songs / list_anime | 本人 | 読み書き |
| 同上 | 誰でも | `is_public` のリストとその中身を読み取り |
| list_likes | 誰でも読み取り、本人のみ追加・削除 | |
| users | 本人、または `is_public` のプロフィールは誰でも | 読み取りは安全な列（id・user_name・bio・icon_url・is_public・created_at）のみ |
| Storage `avatars` | 誰でも読み取り、本人フォルダのみ書き込み | |

### 列単位の権限にしている理由

- **キャッシュ書き込み**：画像と英語表記は外部 API の結果を全員で共有するため、クライアントから DB に書き戻す。行単位の RLS だけだと曲名など他の列まで書き換えられるため、テーブル単位の UPDATE 権限を外し、必要な列だけ列単位で許可している。`image_url` には許可 CDN ドメインの CHECK 制約もかけている（2026-06-27）
- **生年・性別の封鎖**：登録時に集めるが、API からは読めない。以前はテーブル単位の SELECT 権限で公開プロフィールの生年・性別が第三者から読めていた。Postgres ではテーブル単位の権限が全列に及び、列単位の REVOKE では打ち消せないため、テーブル単位の SELECT を外して安全な列だけを付け直した（2026-07-07）。メールアドレスは `auth` スキーマにあり、API には公開されていない

## 4. その他の対策

| 対策 | 内容 |
|---|---|
| セキュリティヘッダー（`netlify.toml`） | `X-Frame-Options: SAMEORIGIN`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security` |
| `robots.txt` | 検索エンジンは許可、GPTBot・CCBot・ClaudeBot・Google-Extended・Bytespider など AI 学習・大量収集クローラは拒否（行儀のよいボットにしか効かない） |
| 画像プロキシ | https かつ許可ホストのみ中継、画像以外は拒否（SSRF 対策） |
| 秘密情報 | `.env` はすべて `.gitignore` 済み。git 履歴にも含まれていないことを確認済み（2026-10-17）。フロントに入る値（Supabase anon キー・Turnstile サイトキー・AdSense のパブリッシャー ID）はもともと公開前提の値 |

### スクレイピングについて

フロントが anon キーで Supabase を直接呼ぶ構成のため、公開データ（曲・アニメ）の取得を完全には止められない。方針は「完全遮断ではなくコストを上げる・認証系の不正を止める・検索エンジンは通す」。

## 5. 既知のリスク

| リスク | 影響 | 対策案 |
|---|---|---|
| anon キーで `title_en` / `title_romaji` / `name_en` を任意の文字列に書き換えられる | 英語表示の改ざん | キャッシュ書き込みを Netlify Function などサーバー側に移し、外部 API の結果だけを書けるようにする |
| ログインユーザーが任意の曲の `youtube_id` を任意の動画に変えられる | 不適切な動画の埋め込み | 登録履歴を残す、通報、または承認制 |
| Supabase 側の CAPTCHA が無効 | 登録スパム・総当たりを API 直叩きで回避される | Supabase で CAPTCHA を有効化（§2） |
| CSP 未設定 | XSS の影響範囲が広い | 広告 SDK の許可リストを確定させてから導入 |
| 検索 RPC の件数上限なし | 全件列挙が容易 | `p_limit` の上限をサーバー側で固定 |
| アカウント削除後もアイコン画像が Storage に残る | プライバシーポリシーの「削除できる」記述と食い違う | 削除時に `avatars/{uid}/` も消す |
| 会員判定がクライアントの localStorage | 誰でも広告を消せる（現状は会員機能が未提供なので実害なし） | 決済導入時に DB / 課金基盤の判定に置き換える |
| 未確認のメールアドレスで登録できる | 他人のアドレスでの登録・捨てアカウント | メール確認を ON にする場合は、確認後にプロフィールを作る流れへ変更が必要 |
| プライバシーポリシーが実態と食い違う | AdSense の審査・法令（個人情報保護法・Google の要件）上の問題 | §6 の項目を反映して改訂 |

## 6. プライバシーポリシー（`pages/Privacy/Privacy.jsx`）と実装の食い違い

2026-10-17 時点で、次の記述が実装と合っていない。

| ポリシーの記述 | 実装 |
|---|---|
| 「広告目的のトラッキングは行っていません」 | `index.html` で AdSense のスクリプト（`adsbygoogle.js`）を常に読み込んでいる。Auto ads のページ要素も挿入されている |
| 外部サービスは Supabase・Netlify・画像取得 API のみ | Google AdSense と Cloudflare Turnstile の記載が無い |
| プロフィール情報として「アイコン画像URL」を収集 | 実際には画像ファイルそのものを Storage に保存している |
| 利用情報は「リスト・曲・タグ・メモ・いいね」 | アニメリストの記載が無い |
| localStorage は「ログイン状態と表示言語」のため | 広告の同意状態・会員フラグ・広告プレビューのキーも保存している |
| 「関連する全てのデータを完全に削除できます」 | アイコン画像は削除されない（§5） |
| —（同意の記載なし） | 広告の同意状態は未設定なら「同意あり」として扱う |
