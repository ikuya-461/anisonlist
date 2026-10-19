# 認証とセキュリティ

## 1. 認証方式

Supabase Auth のメールアドレス + パスワード認証。

| 画面 | 処理 |
|---|---|
| 新規登録 `/register` | ユーザー名・生年・性別・メール・パスワード・パスワード確認をすべて必須で入力（生年は 1900〜今年）→ `auth.signUp` → `users` にプロフィール作成 |
| ログイン `/login` | `auth.signInWithPassword` |
| パスワード再設定 `/forgot-password` → `/reset-password` | `auth.resetPasswordForEmail`（戻り先 `redirectTo` = `/reset-password`）でメール送信 → リンクを開くと supabase-js が URL のトークンから一時的なログイン状態を作る → 新しいパスワードを入力して `auth.updateUser` → マイページへ。リンクが期限切れ・使用済みなら再送を案内する（2026-10-17〜。それまではメール送信だけで変更できなかった） |
| ログアウト | `auth.signOut` |
| アカウント削除（マイページ） | RPC `delete_my_account()` が本人のいいね・リスト（中身も連鎖削除）・認証情報（プロフィールも連鎖削除）を削除。その前にアプリ側で Storage のアイコン画像（`avatars/{user_id}/`）を消し、消せなければアカウントも削除しない（Storage の実体は SQL から削除できないため。2026-10-19〜） |

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
| 会員判定がクライアントの localStorage | 誰でも広告を消せる（現状は会員機能が未提供なので実害なし） | 決済導入時に DB / 課金基盤の判定に置き換える |
| 未確認のメールアドレスで登録できる | 他人のアドレスでの登録・捨てアカウント | メール確認を ON にする場合は、確認後にプロフィールを作る流れへ変更が必要 |

## 6. プライバシーポリシー（`pages/Privacy/Privacy.jsx`）

2026-10-19 に実装と食い違っていた記述を改訂した。

| 改訂前 | 改訂後 |
|---|---|
| 「広告目的のトラッキングは行っていません」 | 削除。「6. 広告について」を新設し、Google AdSense の第三者配信 Cookie、Google の広告設定でのオプトアウト、Google による情報の使用（partner-sites）、EEA・英国・スイス向けの同意確認を記載（AdSense が求める記載事項） |
| 外部サービスは Supabase・Netlify・画像取得 API のみ | Cloudflare Turnstile（ブラウザ・端末情報の送信）と Google AdSense を追加。各社のプライバシーポリシーへのリンクを付けた |
| アイコンは「アイコン画像URL」 | アップロードされた画像ファイルを保管すると明記 |
| 利用情報にアニメリストが無い | 曲リスト・アニメリストを明記 |
| localStorage は「ログイン状態と表示言語」 | 広告表示に関する設定も保存すると明記 |
| 「関連する全てのデータを削除できます」（実際はアイコンが残った） | アイコン画像も削除するよう実装を直したうえで、削除対象にプロフィール・アイコン画像を明記 |
| — | アクセス情報（IP アドレス等）を各サービスが処理すること、生年・性別は他ユーザーに非公開であること、利用目的に不正防止と広告配信を追加 |

残る注意点：

- アプリ内の広告同意（`consent.js`）は未設定なら「同意あり」として扱う。EEA 等の同意確認は AdSense 側の CMP に任せている
- 文面は法務の専門家の確認を受けていない
