# 音楽サービス連携（Spotify / Apple Music / YouTube Music）

現在、SONICLIST はこの 3 サービスのいずれとも**アカウント連携していない**。使っているのは次の 2 つだけ。

- **iTunes Search API**：曲ジャケット・アーティスト画像の取得（認証不要）
- **YouTube 埋め込み**：曲詳細ページで動画を再生（`youtube-nocookie.com` の iframe）。動画 ID が登録済みの曲のみで、未登録の曲は YouTube の検索結果へのリンクになる

本書は、連携を設計する前提として各サービスの責務と制約を整理したもの。

> 制約は 2026-10-17 時点で各社の公式ドキュメントを確認した内容。Spotify の条件は 2025〜2026 年に大きく変わっているため、着手前に再確認すること。

## 1. 責務の比較

| 責務 | Spotify | Apple Music | YouTube Music |
|---|---|---|---|
| **検索** | Web API `GET /search`（開発モードは 1 回最大 10 件） | Apple Music API（カタログ検索）。認証不要で済ませるなら iTunes Search API | 公式 API なし。YouTube Data API `search.list` で代用 |
| **メタデータ取得** | Web API（開発モードでは `popularity` 等が削除済み） | Apple Music API / iTunes Search API | YouTube Data API（動画情報） |
| **再生導線**（外部アプリで開く） | `open.spotify.com` の URL。API 不要 | `music.apple.com` の URL（iTunes Search の結果に含まれる）。API 不要 | `music.youtube.com` の URL。API 不要 |
| **アプリ内再生** | 埋め込みプレーヤー（iframe、ログイン不要で試聴可）。全曲再生の Web Playback SDK は聴く側に Premium が必要 | MusicKit JS。全曲再生は聴く側の Apple Music 契約が必要（非契約者は試聴） | YouTube IFrame Player API（埋め込み） |
| **プレイヤー制御** | 埋め込みの iFrame API（再生・停止・曲の切替） | MusicKit JS（キュー・再生制御） | IFrame Player API（再生・停止・キュー） |
| **プレイリスト書き出し** | `POST /me/playlists` + `/items`。カバー画像のアップロード可 | `POST /v1/me/library/playlists`。カバー画像のアップロード不可 | YouTube Data API `playlists.insert` + `playlistItems.insert`（YouTube Music にも表示される） |
| **認証方式** | OAuth（Authorization Code + PKCE。フロントだけで完結） | Developer Token（JWT、秘密鍵で署名＝サーバー側が必要）+ Music User Token | OAuth 2.0（Google） |
| **開発者の費用** | 無料（ただし開発モードは所有者に Premium が必要） | Apple Developer Program（年額 $99 / ¥15,800） | 無料（割当量の範囲内） |

## 2. 各サービスの制約（ここが設計を決める）

### Spotify：一般公開での API 連携は事実上できない

- 開発モードのアプリは**最大 5 ユーザー**まで、所有者に Premium 契約が必要（2026-02 の変更）
- 制限の無い拡張モードは**法人のみ・月間アクティブユーザー 25 万以上**が条件（2025-05〜）
- 個人開発の SONICLIST は拡張モードの対象外。「Spotify にプレイリストを書き出す」機能は、オーナー本人と招待した 4 人までしか使えない

→ **API を使わない「Spotify で開く」リンクと埋め込みプレーヤーに切り替える。**

### Apple Music：公開可能だが費用とサーバー処理が必要

- Developer Token は秘密鍵で署名する JWT のため、鍵をフロントに置けない。Netlify Function などで発行する必要がある
- Apple Developer Program の年会費がかかる（ストア公開でも必要になるため、ネイティブ版と同時なら追加費用なし）
- プレイリストにカバー画像を付けられない（SONICLIST のシェア画像をそのまま使う案は不可）

### YouTube Music：公式 API が無く、割当量が厳しい

- YouTube Music 専用の公開 API は無い。YouTube Data API で作った再生リストが YouTube Music にも表示される
- 1 日の割当は既定 10,000 ユニット。`playlists.insert` と `playlistItems.insert` は 1 回 50 ユニット
  - 20 曲のリストを書き出すと 50 + 20 × 50 = **1,050 ユニット** → **1 日に 9 回程度**しか書き出せない
- 書き込み権限のスコープを一般ユーザーに使わせるには Google の OAuth 審査が必要になる見込み（要確認）

## 3. SONICLIST としての方針

| 優先 | 内容 | 理由 |
|---|---|---|
| 1 | **曲詳細に「Spotify / Apple Music / YouTube Music で聴く」ボタン** を置く（各サービスの検索 URL へ遷移） | API・認証・費用・ユーザー数制限がすべて不要。全ユーザーに提供できる |
| 2 | Apple Music の曲ページへ直接リンク（iTunes Search の結果に含まれる `trackViewUrl` を保存） | 検索 URL より 1 手少ない。ただし現状は画像 URL しか保存していないため、`songs` に列を追加し、既存の曲は取得し直す（バックフィル）必要がある |
| 3 | 埋め込みプレーヤー（Spotify / YouTube）でのアプリ内試聴 | 認証不要 |
| 4 | Apple Music へのプレイリスト書き出し | 公開可能な唯一の書き出し先。ネイティブ版で Apple Developer に登録した後に着手 |
| 保留 | Spotify へのプレイリスト書き出し | 5 ユーザー制限のため一般公開できない。条件が緩和されたら再検討 |
| 保留 | YouTube への書き出し | 割当量が利用者数に耐えない |

### 以前の計画からの変更

2026-06 時点のロードマップでは「Spotify / Apple Music へのプレイリスト変換」を成長期の柱にしていた。2026-07-07 の調査で Apple Music はカバー画像を付けられないと判明し、Spotify の書き出しは別タスクに切り出していた。今回、Spotify の開発モード制限（5 ユーザー）と拡張モードの条件（法人・25 万 MAU）を確認したため、**書き出し中心の計画から、API 不要の「聴く導線」中心の計画へ変更**する。

## 参考（公式）

- Spotify: [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) / [February 2026 Web API Dev Mode Changes](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) / [Updating the Criteria for Web API Extended Access](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access)
- Apple: [Apple Music API](https://developer.apple.com/documentation/applemusicapi) / [Create a new library playlist](https://developer.apple.com/documentation/applemusicapi/create-a-new-library-playlist)
- Google: [YouTube Data API Overview](https://developers.google.com/youtube/v3/getting-started)
