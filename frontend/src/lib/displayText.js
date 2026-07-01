/* =========================================================
   表示言語に応じてタイトル/名前を選ぶヘルパー
   - lang === "en" のとき英語表記を優先し、無ければ日本語にフォールバック
   - アニメは英題(title_en)が無ければローマ字(title_romaji)→日本語の順
   - どのフィールド名でオブジェクトが来ても拾えるように候補を広めに取る
   ========================================================= */

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

/* アニメ：英語 → ローマ字 → 日本語 */
export function animeTitle(anime, lang) {
  if (!anime) return "";
  const jp = firstNonEmpty(anime.title_jp, anime.title, anime.anime_title);
  if (lang === "en") {
    return firstNonEmpty(anime.title_en, anime.title_romaji, jp) ?? "";
  }
  return jp ?? "";
}

/* ゲーム：英語 → 日本語 */
export function gameTitle(game, lang) {
  if (!game) return "";
  const jp = firstNonEmpty(game.title_jp, game.title, game.game_title);
  if (lang === "en") return firstNonEmpty(game.title_en, jp) ?? "";
  return jp ?? "";
}

/* アーティスト：英語名 → 日本語名 */
export function artistName(artist, lang) {
  if (!artist) return "";
  const jp = firstNonEmpty(artist.name, artist.artist, artist.artist_name);
  if (lang === "en") return firstNonEmpty(artist.name_en, jp) ?? "";
  return jp ?? "";
}

/* 曲：英題 → 日本語曲名 */
export function songTitle(song, lang) {
  if (!song) return "";
  const jp = firstNonEmpty(song.song_title, song.title);
  if (lang === "en") return firstNonEmpty(song.title_en, jp) ?? "";
  return jp ?? "";
}
