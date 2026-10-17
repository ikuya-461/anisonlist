# データベース設計

Supabase（PostgreSQL）を使用する。アプリはフロントエンドから PostgREST / RPC 経由で直接アクセスし、アクセス制御は **RLS（Row Level Security）と列レベル GRANT** で行う。

> 数値は 2026-10-17 時点の本番 DB を直接クエリした値。

## 1. テーブル一覧

| テーブル | 件数 | 役割 |
|---|---:|---|
| `songs` | 231,358 | 楽曲マスタ。`category` でアニソン / ボカロ / VTuber / ゲームを区別 |
| `anime` | 10,196 | アニメ作品マスタ |
| `artists` | 79,741 | 歌手・作詞・作曲・編曲・ボーカル・プロデューサー |
| `games` | 4,979 | ゲーム作品マスタ |
| `song_artists` | 290,433 | 曲 × アーティスト（ボカロのボーカル / プロデューサー用の中間表） |
| `users` | 4 | プロフィール（`auth.users` と 1:1） |
| `lists` | 8 | マイリスト（曲リスト / アニメリスト） |
| `list_songs` | 30 | 曲リストの中身 |
| `list_anime` | 11 | アニメリストの中身 |
| `list_likes` | — | リストへのいいね |

`songs.category` の内訳：vocaloid 123,740 / anime 72,264 / game 30,650 / Vtuber 4,704。

## 2. カラム定義（主要テーブル）

`!` は NOT NULL。

### マスタ系

- **songs**：`id!`, `song_title`, `song_type: song_type_enum`, `category!`, `song_info`, `release_date`, `anime_id → anime`, `game_id → games`, `artist_id / lyricist_id / composer_id / arranger_id → artists`, `image_url`, `youtube_id`, `title_en`, `created_at`
- **anime**：`id!`, `title_jp!`, `title_en`, `title_romaji`, `release_year`, `release_season`, `release_date`, `type: anime_type`, `image_url`, `created_at`
- **artists**：`id!`, `name!`, `name_en`, `role!: artist_role`, `image_url`, `created_at`
- **games**：`id!`, `title_jp!`, `title_en`, `release_year: smallint`, `image_url`, `created_at`
- **song_artists**：`id!`, `song_id! → songs`, `artist_id! → artists`, `role!: artist_role`, `created_at`（`(song_id, artist_id, role)` 一意）

### ユーザー系

- **users**：`id! → auth.users`, `user_name!`, `bio`, `icon_url`, `is_public`, `birth_year: smallint`, `gender`, `created_at`
- **lists**：`id!`, `user_id → users`, `name!`, `description`, `is_public`, `position!`, `list_type!`（`song` / `anime`）, `created_at`
- **list_songs**：`id!`, `list_id! → lists`, `song_id! → songs`, `position!`, `memo`, `emotion_tags: text[]`, `encounter_type`, `created_at`
- **list_anime**：`id!`, `list_id! → lists`, `anime_id! → anime`, `position!`, `memo`, `anime_tags: text[]`, `created_at`
- **list_likes**：`list_id! → lists`, `user_id! → auth.users`, `created_at`

### Enum

| 型 | 値 |
|---|---|
| `song_type_enum` | OP, ED, 挿入歌, テーマソング, イメージソング, CMソング, アレンジ曲, アレンジ原曲, スピンオフ, 非公式関連曲, ボカロ曲, オリジナル曲, なし, 不明 |
| `anime_type` | Anime, TVSpecial, OVA, WebAnime, AnimeMovie |
| `artist_role` | artist, lyricist, composer, arranger, vocalist, producer |
| `release_season_enum` | 春アニメ, 夏アニメ, 秋アニメ, 冬アニメ, 空欄（※`anime.release_season` 列自体は text） |

### 関連の取り方

- アニソン・VTuber・ゲーム曲：`songs.artist_id` 等の直接列で歌手を参照
- ボカロ曲：ボーカル・プロデューサーが複数になるため `song_artists` 中間表で参照（`role` = vocalist / producer）
- 削除連鎖：`lists` を消すと `list_songs` / `list_anime` / `list_likes` が `ON DELETE CASCADE` で消える。`auth.users` を消すと `users` が消える

## 3. インデックス

| テーブル | インデックス | 目的 |
|---|---|---|
| songs | `idx_songs_title_trgm`（GIN, pg_trgm） | 曲名の部分一致・曖昧検索 |
| songs | `idx_songs_artist_id`, `idx_songs_category_id`, `idx_songs_game_id`, `idx_songs_voc_lookup` | 結合・カテゴリ絞り込み |
| anime | `idx_anime_title_jp_trgm`, `idx_anime_title_en_trgm`（GIN） | アニメ名の曖昧検索（2026-07-21 追加） |
| artists | `idx_artists_name_trgm`（GIN）, `idx_artists_name_role` | アーティスト名の曖昧検索 |
| games | `idx_games_title` | ゲーム名検索 |
| song_artists | `idx_song_artists_song_id`, `idx_song_artists_artist_id` | ボカロのボーカル / P 引き当て |
| list_songs / list_anime | `(list_id, position)` 一意, `(list_id, song_id|anime_id)` 一意 | 並び順の一意性・重複追加防止 |

## 4. RPC（データベース関数）

| 関数 | 権限 | 用途 |
|---|---|---|
| `search_songs(p_keyword, p_artist, p_anime, p_type, p_category, p_year, p_limit, p_offset)` | invoker | 曲検索（曖昧検索 + 関連度順） |
| `search_anime(p_keyword, p_year, p_season, p_limit, p_offset)` | invoker | アニメ検索（曖昧検索 + 関連度順） |
| `search_artists(p_keyword, p_limit, p_offset)` | invoker | アーティスト検索（曖昧検索 + 関連度順） |
| `reorder_list_songs(p_list_id, p_orders)` | SECURITY DEFINER | 曲リストの並び替え（一意制約を壊さず一括更新） |
| `reorder_list_anime(p_list_id, p_orders)` | SECURITY DEFINER | アニメリストの並び替え |
| `delete_my_account()` | SECURITY DEFINER | 本人のいいね・リスト・アカウントを削除（ストア審査要件）。**Storage のアイコン画像は消えない** |

検索 RPC の設計判断は [api.md](api.md#2-検索-rpc-の設計) を参照。

## 5. Storage

| バケット | 公開 | 用途 | ポリシー |
|---|---|---|---|
| `avatars` | public | ユーザーアイコン（`{user_id}/icon.jpg`） | 読み取りは誰でも、書き込み・更新・削除は先頭フォルダが `auth.uid()` と一致する本人のみ |

## 6. マイグレーション

マイグレーションツールは使っておらず、`backend/supabase/*.sql` を **psql で手動適用** している。ファイル名に連番が無いため、適用順を以下に記録する（git の追加日順）。

| 順 | ファイル | 内容 |
|---:|---|---|
| 1 | `migration_netlify_rls.sql` | Express 廃止に伴う RLS 有効化・FK 追加・`reorder_list_songs`（2026-06-08）。全件公開の `users_select_all` も含む（本番では削除済み） |
| 2 | `migration_vocaloid_songs.sql` + `import_vocaloid.sql` | ボカロ曲スキーマ・`song_artists`・データ投入 |
| 3 | `import_vtuber.sql` | VTuber 曲データ投入 |
| 4 | `migration_search_rpc.sql` | `search_songs` 初版・pg_trgm 導入 |
| 5 | `migration_artist_image.sql` | アーティスト画像キャッシュ列と、ログインユーザー向けの UPDATE ポリシー |
| 6 | `migration_search_year.sql` | `search_songs` に年フィルタ（8 引数版） |
| 7 | `migration_user_gender.sql` | 性別カラム |
| 8 | `migration_games.sql` + `import_games.sql` + `migration_search_games.sql` | `games` テーブル・ゲーム曲。`search_songs` の作品名にゲーム名も出すよう変更（アニメ名が無ければゲーム名） |
| 9 | `migration_english_titles.sql` | 英題キャッシュ列（`title_en` 等）と、その列の UPDATE を anon / authenticated に付与（§8 の書き換えリスクの直接の原因） |
| 10 | `migration_delete_account.sql` | `delete_my_account` |
| 11 | `migration_anime_lists.sql` | `lists.list_type`・`list_anime`・`reorder_list_anime` |
| 12 | `migration_avatar_storage.sql` | `avatars` バケットと RLS |
| 13 | `migration_lock_demographics.sql` | 生年・性別の API 読み取り封鎖 |
| 14 | `migration_search_fuzzy.sql` | `search_songs` を曖昧検索 + 関連度順に置換。8 のゲーム名の表示を落としていた（退行。2026-10-17 に同ファイルを修正して再適用） |
| 15 | `migration_search_fuzzy_anime_artist.sql` | `search_anime` / `search_artists` 新設・anime の trgm インデックス |
| 16 | `import_anison_2026.sql`（**未コミット**） | 2026 年作品のアニソン投入。2026-07-20 に適用済み（同日作成の行：アニメ 93・曲 1,926・アーティスト 1,143。作成日時と投入元 CSV の更新日時から判断） |
| 17 | `migration_security_baseline.sql` | **最後に適用する**。本番の RLS・ポリシー・列単位権限・`image_url` の CHECK 制約をカタログから書き出したもの（2026-10-17）。対象テーブルのポリシーを一度すべて削除して本番と同じ一式を作り直すため、それ以前の SQL の状態に関係なく本番と同じ権限になる |

> **権限の基準は `migration_security_baseline.sql`。** 2026-06-27 のセキュリティ修正（`users_select_all` の削除、UPDATE を列単位に絞る REVOKE / GRANT、`image_url` の CHECK 制約）と、ダッシュボードで作ったポリシー（`list_likes` の全ポリシー、anon 向けキャッシュ更新ポリシーなど 15 件）は本番 DB にしか無かった。2026-10-17 に本番のカタログから書き出してこのファイルにした。
>
> それ以前の SQL（1〜16）だけを流すと、非公開ユーザーのプロフィールが読める（`users_select_all`）・ログインユーザーが曲名などを書き換えられる・未ログインでキャッシュを書き込めない、という状態になるが、最後に 17 を流せば解消する。
>
> 検証（2026-10-17、本番で `BEGIN … ROLLBACK`）：①本番に適用しても権限・ポリシー・制約・RLS・関数の権限に変化なし、②`users_select_all` の作成・テーブル単位 UPDATE / SELECT の付与・ポリシーと制約の削除で「リポジトリの SQL だけで作った状態」を再現してから適用すると、本番と完全に一致する状態に戻る。
>
> このほか、リポジトリの SQL だけでは新しい環境を構築できない：
> - 基本テーブル（`songs` / `anime` / `artists` / `users` / `lists` / `list_songs` / `list_likes`）の `CREATE TABLE` がリポジトリに無い
> - `song_type_enum` の値 `オリジナル曲` を追加する SQL が無い（`import_vtuber.sql` は追加済みを前提にしている）

## 7. 設計判断とその理由

| 判断 | 理由 |
|---|---|
| フロントから Supabase 直結（Express 廃止） | Netlify で静的配信するため。サーバー運用コストを無くす（2026-06-08） |
| 生年・性別は **書き込み専用**（anon / authenticated から SELECT 不可） | テーブル単位の SELECT 権限は全列に及ぶため、公開プロフィールの生年・性別が API から読めていた。テーブル単位の SELECT を剥がし、安全な列だけ列単位で再付与した（列単位の REVOKE だけでは効かないという Postgres の仕様による）。分析は service_role / psql で行う |
| 画像・英題のキャッシュをクライアントから DB に書く | 外部 API の結果を一度だけ取得して全ユーザーで共有するため。代わりに anon に限定列の UPDATE を許可している（下記リスク参照） |
| `image_url` に CDN ドメインの CHECK 制約 | クライアント書き込みを許す代わりに、任意 URL（外部サイト・トラッキング画像）を入れられないようにする |
| ボカロ曲だけ中間表 `song_artists` | ボーカル・プロデューサーが複数になるため、直接列では表現できない |

## 8. 既知の課題

- **anon による英語名の書き換え**：`title_en` / `title_romaji` / `name_en` は CHECK 制約が無く、anon キーで任意の文字列に書き換えられる。`youtube_id` もログインユーザーなら任意の動画 ID に書き換えられる。対策案はキャッシュ書き込みをサーバー側関数に移すこと（[ROADMAP](../ROADMAP.md) の Issue 参照）
- **NOT VALID の外部キー**：`songs` → `anime` / `artists`、`lists` → `users` の FK は既存行を検証していない（取り込みデータに不整合が残っている可能性）
- **重複ポリシー**：`lists`（`UserList*` と `lists_*_own`）・`users`（`Allow * own user` と `users_*_own`）・`list_songs`（公開リスト閲覧の 2 件）で、ダッシュボード作成分と SQL 作成分が併存している。PERMISSIVE なので OR で効き動作は同じだが整理対象（ベースラインは本番の現状どおり両方を作る）
- **マイグレーション管理**：連番・適用記録が無い。権限は `migration_security_baseline.sql` で本番と揃えたが、テーブル定義は未整備。本番のスキーマを `pg_dump --schema-only` で書き出して基準点にし、Supabase CLI の `supabase/migrations/` 形式へ移行するのが望ましい
- **`reorder_list_songs` の実行権限**：`authenticated` に付与しているが、`public` / `anon` から取り消していない（`reorder_list_anime` と `delete_my_account` は取り消している）。関数内で所有者を確認しているため実害はない
- **データ削除の記録**：2026-06-27 に重複曲 88 件・重複アニメ 3,383 件を本番で直接削除している（SQL は未保存）
