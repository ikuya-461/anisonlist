/* =========================================================
   UI文言の翻訳辞書 + データ値ラベル
   - t(key, vars) で参照。{name} 形式の簡易補間対応
   - データ値（曲タイプ・季節・カテゴリ・タグ等）は valueLabel() で参照
   ========================================================= */

export const TR = {
  ja: {
    /* 共通 */
    "common.back": "← 戻る",
    "common.search": "検索",
    "common.searching": "検索中...",
    "common.save": "保存",
    "common.saving": "保存中...",
    "common.cancel": "キャンセル",
    "common.loading": "読み込み中...",
    "common.all": "すべて",
    "common.unknown": "不明",
    "common.none": "なし",
    "common.notFound": "見つかりませんでした。",

    /* ヘッダー / ホーム */
    "home.ctaText": "プレイリストを作成・シェアするには\nアカウントが必要です",
    "home.getStarted": "無料で始める",
    "home.login": "ログイン",

    /* 検索 */
    "search.heading.addToList": "ADD TO LIST",
    "search.tab.song": "曲",
    "search.tab.anime": "アニメ",
    "search.tab.game": "ゲーム",
    "search.tab.artist": "アーティスト",
    "search.ph.songTitle": "曲名",
    "search.ph.artist": "歌手名",
    "search.ph.animeTitle": "アニメタイトル",
    "search.ph.gameTitle": "ゲームタイトル",
    "search.ph.artistName": "アーティスト名",
    "search.label.category": "カテゴリー",
    "search.label.songType": "曲タイプ",
    "search.label.year": "年代",
    "search.label.season": "シーズン",
    "search.err.songNeed": "曲名・歌手名・アニメタイトルのいずれかを入力してください",
    "search.err.animeNeed": "アニメタイトル・年代・シーズンのいずれかを指定してください",
    "search.err.gameNeed": "ゲームタイトル・年代のいずれかを指定してください",
    "search.err.artistNeed": "アーティスト名を入力してください",
    "search.picker.back": "← {name} の検索結果に戻る",
    "search.picker.songs": "{name} の曲",
    "search.picker.empty": "曲が見つかりませんでした。",
    "search.year.suffix": "{year}年",
    "search.pager.prev": "← 前へ",
    "search.pager.next": "次へ →",

    /* 詳細ページ共通 */
    "detail.anime.notFound": "アニメが見つかりません。",
    "detail.game.notFound": "ゲームが見つかりません。",
    "detail.artist.notFound": "アーティストが見つかりません。",
    "detail.song.notFound": "曲が見つかりませんでした。",
    "detail.field.type": "タイプ",
    "detail.field.airYear": "放送年",
    "detail.field.releaseYear": "リリース年",
    "detail.field.season": "シーズン",
    "detail.section.animeSongs": "🎵 このアニメの曲",
    "detail.section.gameSongs": "🎮 このゲームの曲",
    "detail.section.artistSongs": "🎵 担当曲",
    "detail.artist.total": "全 {total} 曲",
    "detail.artist.totalPaged": "全 {total} 曲（{page} / {pages} ページ）",

    /* 曲詳細 */
    "song.share": "𝕏 この曲をシェア",
    "song.ytSearch": "▶ YouTubeで検索",
    "song.ytEdit": "▶ YouTube IDを変更",
    "song.ytRegister": "▶ YouTube IDを登録",
    "song.ytPh": "YouTube URL または動画ID",
    "song.field.vocal": "ボーカル",
    "song.field.producer": "プロデューサー",
    "song.field.singer": "歌手",
    "song.field.lyricist": "作詞",
    "song.field.composer": "作曲",
    "song.field.arranger": "編曲",
    "song.field.releaseDate": "公開日",
    "song.field.songInfo": "曲情報",

    /* 曲追加モーダル */
    "modal.added": "＋ {title}",
    "modal.sub": "追加しました！タグをつけますか？",
    "modal.emotionLabel": "この曲は？",
    "modal.encounterLabel": "どこで知った？",
    "modal.memoLabel": "一言メモ（任意）",
    "modal.memoPh": "例：厨二病が悪化した神曲",
    "modal.skip": "スキップ",
    "modal.save": "保存する",

    /* 認証 */
    "auth.email": "メールアドレス",
    "auth.password": "パスワード",
    "auth.userName": "ユーザー名",
    "auth.birthYear": "生年",
    "auth.gender": "性別",
    "auth.register": "登録",
    "auth.login": "ログイン",
    "auth.logout": "ログアウト",
    "auth.forgotPassword": "パスワードを忘れた方",
    "auth.register.title": "新規登録",
    "auth.login.title": "ログイン",
    "auth.forgot.title": "パスワード再設定",
    "auth.ph.userName": "ユーザー名",
    "auth.ph.birthYear": "生年（例: 2000）",
    "auth.ph.gender": "性別を選択",
    "auth.ph.email": "メールアドレス",
    "auth.ph.password": "パスワード",
    "auth.ph.passwordConfirm": "パスワード（確認）",
    "auth.btn.signup": "登録する",
    "auth.btn.login": "ログインする",
    "auth.btn.sendReset": "再設定メールを送る",
    "auth.pw.weak": "弱いパスワードです",
    "auth.pw.medium": "普通の強さです",
    "auth.pw.strong": "強いパスワードです",
    "auth.haveAccount": "すでにアカウントをお持ちの方は",
    "auth.loginHere": "ログインはこちら",
    "auth.noAccount": "アカウントをお持ちでない方は",
    "auth.registerHere": "新規登録はこちら",
    "auth.err.allFields": "すべての項目を入力してください",
    "auth.err.birthRange": "生年は1900〜{year}の範囲で入力してください",
    "auth.err.pwMismatch": "パスワードが一致していません",
    "auth.err.profileSave": "ユーザー情報の保存に失敗しました",
    "auth.err.invalidCredentials": "メールアドレスまたはパスワードが違います",
    "auth.msg.signupDone": "登録が完了しました。メールを確認してください。",
    "auth.msg.resetSent": "再設定メールを送信しました。メールを確認してください。",
    "auth.err.emailRequired": "メールアドレスを入力してください",
    "auth.err.emailInvalid": "メールアドレスが正しくありません",
    "auth.ph.registeredEmail": "登録したメールアドレス",
    "auth.btn.sendEmail": "メールを送信",
    "auth.backToLogin": "ログイン画面に戻る",

    /* 性別 */
    "gender.male": "男性",
    "gender.female": "女性",
    "gender.other": "その他",
    "gender.noAnswer": "回答しない",

    /* リスト */
    "list.rename": "名前変更",
    "list.viewPublic": "🌐 公開ページを見る",
    "list.share": "𝕏 シェア",
    "list.descPh": "リストの説明（200文字以内）",
    "list.addDesc": "説明を追加...",
    "list.moveToOther": "別のリストへ移動",
    "list.publicPage": "🌐 公開ページ",
    "list.togglePublicOn": "公開中（クリックで非公開）",
    "list.togglePublicOff": "非公開（クリックで公開）",
    "list.empty": "まだ曲がありません。下の検索から追加しましょう。",
    "list.confirmDelete": "このリストを削除しますか？",
    "list.create": "＋ 新しいリスト",
    "list.namePh": "リスト名",

    /* マイページ / 公開ページ */
    /* ランキング画像 */
    "ranking.open": "🖼️ ランキング画像を作る",
    "ranking.title": "ランキング画像",
    "ranking.templateLabel": "テンプレート（この気分で選ぶ）",
    "ranking.modeLabel": "形式",
    "ranking.mode.ranking": "🏆 ランキング",
    "ranking.mode.list": "🎵 リスト",
    "ranking.download": "画像を保存",
    "ranking.share": "SNSでシェア",
    "ranking.generating": "生成中...",
    "ranking.empty": "リストに曲がありません",

    "mypage.myLists": "マイリスト",
    "mypage.logout": "ログアウト",
    "mypage.lists": "リスト",
    "mypage.editProfile": "プロフィールを編集",
    "mypage.public": "🌐 公開中",
    "mypage.private": "🔒 非公開",
    "mypage.viewPublicProfile": "公開ページを見る →",
    "mypage.gallery": "作品ギャラリー",
    "public.by": "作成者",
    "public.noLists": "公開リストがありません。",
    "public.author": "作成者：",
    "public.listPrivate": "このリストは非公開または存在しません。",
    "public.profilePrivate": "このプロフィールは非公開または存在しません。",
    "public.noSongs": "曲が登録されていません。",
    "public.publicLists": "🎵 公開リスト",
    "public.noPublicLists": "公開リストはありません。",
    "list.createNew": "＋ 新しいリストを作成",
    "list.newNamePh": "新しいリスト名",
    "list.creating": "作成中...",
    "list.createBtn": "作成",
    "list.delete": "削除",
    "list.confirmDeleteTitle": "リストを削除しますか？",
    "list.confirmDeleteText": "この操作は取り消せません。",
    "list.deleting": "削除中...",
    "list.deleteConfirm": "削除する"
  },

  en: {
    "common.back": "← Back",
    "common.search": "Search",
    "common.searching": "Searching...",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.cancel": "Cancel",
    "common.loading": "Loading...",
    "common.all": "All",
    "common.unknown": "Unknown",
    "common.none": "None",
    "common.notFound": "Not found.",

    "home.ctaText": "Sign up to create and\nshare your playlists",
    "home.getStarted": "Get started free",
    "home.login": "Log in",

    "search.heading.addToList": "ADD TO LIST",
    "search.tab.song": "Songs",
    "search.tab.anime": "Anime",
    "search.tab.game": "Games",
    "search.tab.artist": "Artists",
    "search.ph.songTitle": "Song title",
    "search.ph.artist": "Artist name",
    "search.ph.animeTitle": "Anime title",
    "search.ph.gameTitle": "Game title",
    "search.ph.artistName": "Artist name",
    "search.label.category": "Category",
    "search.label.songType": "Song type",
    "search.label.year": "Year",
    "search.label.season": "Season",
    "search.err.songNeed": "Enter a song title, artist, or anime title",
    "search.err.animeNeed": "Specify an anime title, year, or season",
    "search.err.gameNeed": "Specify a game title or year",
    "search.err.artistNeed": "Enter an artist name",
    "search.picker.back": "← Back to results for {name}",
    "search.picker.songs": "Songs from {name}",
    "search.picker.empty": "No songs found.",
    "search.year.suffix": "{year}",
    "search.pager.prev": "← Prev",
    "search.pager.next": "Next →",

    "detail.anime.notFound": "Anime not found.",
    "detail.game.notFound": "Game not found.",
    "detail.artist.notFound": "Artist not found.",
    "detail.song.notFound": "Song not found.",
    "detail.field.type": "Type",
    "detail.field.airYear": "Aired",
    "detail.field.releaseYear": "Released",
    "detail.field.season": "Season",
    "detail.section.animeSongs": "🎵 Songs from this anime",
    "detail.section.gameSongs": "🎮 Songs from this game",
    "detail.section.artistSongs": "🎵 Credited songs",
    "detail.artist.total": "{total} songs",
    "detail.artist.totalPaged": "{total} songs (page {page} / {pages})",

    "song.share": "𝕏 Share this song",
    "song.ytSearch": "▶ Search on YouTube",
    "song.ytEdit": "▶ Change YouTube ID",
    "song.ytRegister": "▶ Add YouTube ID",
    "song.ytPh": "YouTube URL or video ID",
    "song.field.vocal": "Vocals",
    "song.field.producer": "Producer",
    "song.field.singer": "Artist",
    "song.field.lyricist": "Lyrics",
    "song.field.composer": "Composer",
    "song.field.arranger": "Arranger",
    "song.field.releaseDate": "Release date",
    "song.field.songInfo": "Song info",

    "modal.added": "＋ {title}",
    "modal.sub": "Added! Want to tag it?",
    "modal.emotionLabel": "How's this song?",
    "modal.encounterLabel": "Where did you find it?",
    "modal.memoLabel": "Note (optional)",
    "modal.memoPh": "e.g. the song that made me worse",
    "modal.skip": "Skip",
    "modal.save": "Save",

    "auth.email": "Email",
    "auth.password": "Password",
    "auth.userName": "Username",
    "auth.birthYear": "Birth year",
    "auth.gender": "Gender",
    "auth.register": "Sign up",
    "auth.login": "Log in",
    "auth.logout": "Log out",
    "auth.forgotPassword": "Forgot your password?",
    "auth.register.title": "Sign up",
    "auth.login.title": "Log in",
    "auth.forgot.title": "Reset password",
    "auth.ph.userName": "Username",
    "auth.ph.birthYear": "Birth year (e.g. 2000)",
    "auth.ph.gender": "Select gender",
    "auth.ph.email": "Email",
    "auth.ph.password": "Password",
    "auth.ph.passwordConfirm": "Confirm password",
    "auth.btn.signup": "Sign up",
    "auth.btn.login": "Log in",
    "auth.btn.sendReset": "Send reset email",
    "auth.pw.weak": "Weak password",
    "auth.pw.medium": "Medium strength",
    "auth.pw.strong": "Strong password",
    "auth.haveAccount": "Already have an account?",
    "auth.loginHere": "Log in here",
    "auth.noAccount": "Don't have an account?",
    "auth.registerHere": "Sign up here",
    "auth.err.allFields": "Please fill in all fields",
    "auth.err.birthRange": "Birth year must be between 1900 and {year}",
    "auth.err.pwMismatch": "Passwords do not match",
    "auth.err.profileSave": "Failed to save your profile",
    "auth.err.invalidCredentials": "Incorrect email or password",
    "auth.msg.signupDone": "Sign-up complete. Please check your email.",
    "auth.msg.resetSent": "Reset email sent. Please check your inbox.",
    "auth.err.emailRequired": "Enter your email address",
    "auth.err.emailInvalid": "That email address is not valid",
    "auth.ph.registeredEmail": "Your registered email",
    "auth.btn.sendEmail": "Send email",
    "auth.backToLogin": "Back to login",

    "gender.male": "Male",
    "gender.female": "Female",
    "gender.other": "Other",
    "gender.noAnswer": "Prefer not to say",

    "list.rename": "Rename",
    "list.viewPublic": "🌐 View public page",
    "list.share": "𝕏 Share",
    "list.descPh": "List description (max 200 chars)",
    "list.addDesc": "Add a description...",
    "list.moveToOther": "Move to another list",
    "list.publicPage": "🌐 Public",
    "list.togglePublicOn": "Public (click to make private)",
    "list.togglePublicOff": "Private (click to make public)",
    "list.empty": "No songs yet. Add some from the search below.",
    "list.confirmDelete": "Delete this list?",
    "list.create": "＋ New list",
    "list.namePh": "List name",

    "ranking.open": "🖼️ Create ranking image",
    "ranking.title": "Ranking image",
    "ranking.templateLabel": "Template (pick your mood)",
    "ranking.modeLabel": "Format",
    "ranking.mode.ranking": "🏆 Ranking",
    "ranking.mode.list": "🎵 List",
    "ranking.download": "Save image",
    "ranking.share": "Share to SNS",
    "ranking.generating": "Generating...",
    "ranking.empty": "No songs in this list",

    "mypage.myLists": "My lists",
    "mypage.logout": "Log out",
    "mypage.lists": "Lists",
    "mypage.editProfile": "Edit profile",
    "mypage.public": "🌐 Public",
    "mypage.private": "🔒 Private",
    "mypage.viewPublicProfile": "View public page →",
    "mypage.gallery": "Gallery",
    "public.by": "by",
    "public.noLists": "No public lists.",
    "public.author": "by ",
    "public.listPrivate": "This list is private or does not exist.",
    "public.profilePrivate": "This profile is private or does not exist.",
    "public.noSongs": "No songs in this list.",
    "public.publicLists": "🎵 Public lists",
    "public.noPublicLists": "No public lists.",
    "list.createNew": "＋ Create a new list",
    "list.newNamePh": "New list name",
    "list.creating": "Creating...",
    "list.createBtn": "Create",
    "list.delete": "Delete",
    "list.confirmDeleteTitle": "Delete this list?",
    "list.confirmDeleteText": "This cannot be undone.",
    "list.deleting": "Deleting...",
    "list.deleteConfirm": "Delete"
  }
};

/* -------------------------------------------------------
   データ値のバイリンガルラベル
   （DBの実値 → { ja, en }）
------------------------------------------------------- */
export const SONG_TYPE_LABELS = {
  "OP":         { ja: "OP", en: "OP" },
  "ED":         { ja: "ED", en: "ED" },
  "挿入歌":     { ja: "挿入歌", en: "Insert Song" },
  "テーマソング": { ja: "テーマソング", en: "Theme Song" },
  "イメージソング": { ja: "イメージソング", en: "Image Song" },
  "CMソング":   { ja: "CMソング", en: "CM Song" },
  "アレンジ曲": { ja: "アレンジ曲", en: "Arrangement" },
  "アレンジ原曲": { ja: "アレンジ原曲", en: "Original of Arrangement" },
  "スピンオフ": { ja: "スピンオフ", en: "Spin-off" },
  "非公式関連曲": { ja: "非公式関連曲", en: "Unofficial Related" },
  "ボカロ曲":   { ja: "ボカロ曲", en: "Vocaloid" },
  "オリジナル曲": { ja: "オリジナル曲", en: "Original" },
  "なし":       { ja: "なし", en: "None" },
  "不明":       { ja: "不明", en: "Unknown" }
};

export const SEASON_LABELS = {
  "冬アニメ": { ja: "冬", en: "Winter" },
  "春アニメ": { ja: "春", en: "Spring" },
  "夏アニメ": { ja: "夏", en: "Summer" },
  "秋アニメ": { ja: "秋", en: "Fall" }
};

export const CATEGORY_LABELS = {
  "anime":    { ja: "アニソン", en: "Anime" },
  "vocaloid": { ja: "ボカロ", en: "Vocaloid" },
  "Vtuber":   { ja: "VTuber", en: "VTuber" },
  "game":     { ja: "ゲーム", en: "Game" }
};

export const ANIME_TYPE_LABELS = {
  "Anime": { ja: "アニメ", en: "Anime" }
};

export const EMOTION_LABELS = {
  god:           { ja: "✨ 神曲",       en: "✨ Masterpiece" },
  cry:           { ja: "😭 泣ける",     en: "😭 Tearjerker" },
  hype:          { ja: "🔥 熱い",       en: "🔥 Hype" },
  nostalgic:     { ja: "🕰️ エモい",     en: "🕰️ Nostalgic" },
  life_changing: { ja: "💊 人生変わった", en: "💊 Life-changing" },
  night_listen:  { ja: "🌙 夜聴く系",   en: "🌙 Late night" },
  work_bgm:      { ja: "🥱 作業用",     en: "🥱 Focus BGM" },
  chuunibyou:    { ja: "💀 厨二病",     en: "💀 Chuunibyou" },
  lyrics_insane: { ja: "🤯 歌詞がヤバい", en: "🤯 Wild lyrics" }
};

export const ENCOUNTER_LABELS = {
  anime:       { ja: "📺 アニメを見て",      en: "📺 From the anime" },
  niconico:    { ja: "🎵 ニコニコ動画",      en: "🎵 Niconico" },
  youtube:     { ja: "🌐 YouTube",          en: "🌐 YouTube" },
  streaming:   { ja: "🎧 サブスク",          en: "🎧 Streaming" },
  sns:         { ja: "📱 SNS",              en: "📱 Social media" },
  friend:      { ja: "👥 友人に教わった",    en: "👥 A friend" },
  rhythm_game: { ja: "🎮 音ゲー",           en: "🎮 Rhythm game" },
  karaoke:     { ja: "🎤 カラオケ",         en: "🎤 Karaoke" },
  live_event:  { ja: "🎪 ライブ・フェス",    en: "🎪 Live / festival" },
  random:      { ja: "🔀 たまたま",         en: "🔀 Stumbled on it" }
};

/* モーダル用のフル出会いラベル（アイコン＋説明） */
export const ENCOUNTER_OPTION_LABELS = {
  anime:       { ja: "📺 アニメを見て",         en: "📺 Watching the anime" },
  niconico:    { ja: "🎵 ニコニコ動画",         en: "🎵 Niconico" },
  youtube:     { ja: "🌐 YouTube",             en: "🌐 YouTube" },
  streaming:   { ja: "🎧 サブスク（Spotify等）", en: "🎧 Streaming (Spotify etc.)" },
  sns:         { ja: "📱 SNS（X/TikTok）",      en: "📱 Social (X / TikTok)" },
  friend:      { ja: "👥 友人に教えてもらった",  en: "👥 A friend told me" },
  rhythm_game: { ja: "🎮 音ゲー",              en: "🎮 Rhythm game" },
  karaoke:     { ja: "🎤 カラオケ",            en: "🎤 Karaoke" },
  live_event:  { ja: "🎪 ライブ・フェスで",     en: "🎪 At a live / festival" },
  random:      { ja: "🔀 たまたま流れてきた",   en: "🔀 Just came across it" }
};

/* -------------------------------------------------------
   参照ヘルパー
------------------------------------------------------- */
export function translate(key, lang = "ja", vars) {
  const table = TR[lang] || TR.ja;
  let str = table[key] ?? TR.ja[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}

/* データ値ラベル（マップと実値と言語を渡す。未知値はそのまま返す） */
export function valueLabel(map, value, lang = "ja") {
  if (value == null) return "";
  const entry = map[value];
  if (!entry) return value;
  return entry[lang] ?? entry.ja ?? value;
}
