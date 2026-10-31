/* =========================================================
   曲ジャケットの判定（iTunes の検索結果から採用する 1 件を選ぶ）
   - アプリ（songImageCache）と一括取得・測定ツール（tools/image-accuracy）で共通に使う
     ため、Node からも読めるよう import は拡張子付きで書き、ブラウザ専用の物に依存しない
   - 方針：誤った画像を付けるより NO IMAGE。歌手が一致しない候補は原則採用しない
     （2026-10-30 の測定で、誤りはすべて「曲名だけ一致・歌手は別人」だった）
   ========================================================= */
import { normalizeText } from "./normalize.js";
import { ITUNES_SEARCH_API } from "../constants.js";

// 歌手が一致した候補に求める曲名の近さ（0〜1）
export const MATCH_THRESHOLD = 0.72;

// 比較用にタイトルを正規化（括弧書き・"- xxx" 等の付帯情報を落として記号も除去）
export function normForMatch(str) {
  return normalizeText(str)
    .replace(/[([{（【「].*?[)\]}）】」]/g, "") // 括弧書き（Instrumental 等）を除去
    .replace(/\s*[-–—]\s.*$/, "")              // 「 - 〇〇 ver.」等の後置を除去
    .replace(/(?:feat|ft)\.?.*$/i, "")          // feat. 以降を除去
    .replace(/[!！?？。、,.\-_/~〜・:：'"’”ʼ♥♡★☆♪]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// 文字バイグラムの Dice 係数（0〜1）で文字列類似度を測る
export function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const big = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const A = big(a);
  const B = big(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// 空白と記号を落とした比較キー（「小倉 唯」と「小倉唯」、「’」と「'」を同じにする）
export function looseKey(str) {
  return normalizeText(str).replace(/[\s'’‘ʼ"“”`・･.。,、!！?？\-–—_/~〜:：;*★☆♪♡♥&＆+^]/g, "");
}

// 歌手名を人名単位のキーに分ける（連名・「キャラ名 (CV. 声優名)」の両方を拾う）
function artistTokens(str) {
  return normalizeText(str)
    .split(/[,、&＆×/=]|\s(?:feat\.?|ft\.|with|starring)\s/)
    .flatMap((part) => part.split(/[()[\]（）［］]/))
    .map((seg) => looseKey(seg.replace(/^\s*c\.?v\s*[.:：]?/, "")))
    .filter(Boolean); // 1 文字の名前（「叶」など）も完全一致なら同じ歌手
}

// 歌手が同じとみなせるか（表記差は許し、別人は許さない）
export function artistMatches(queryArtist, resultArtist) {
  const qs = artistTokens(queryArtist);
  const rs = new Set(artistTokens(resultArtist));
  if (qs.some((k) => rs.has(k))) return true;
  // 「LiSA」と「LiSA(織部里沙)」のような付記違い。短い名前は別人と取り違えやすいので 4 文字以上に限る
  const a = looseKey(queryArtist);
  const b = looseKey(resultArtist);
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.includes(short);
}

// 検索用：版の表記（括弧書き・-xxx-・〜xxx〜・「〇〇ver.」・feat.）を落とした曲名
export function stripVersion(title) {
  const t = normalizeText(title);
  const stripped = t
    .replace(/(?:^|\s)(?:featuring|feat\.?|ft\.)\s.*$/, "")
    .replace(/[([{<（【「〈《].*?[)\]}>）】」〉》]/g, " ")
    .replace(/\s*[-~〜～][^-~〜～]*[-~〜～]\s*$/, "")
    .replace(/\s+\S*(?:ver\.?|version|バージョン|ヴァージョン|mix|remix)\.?$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || t;
}

// 検索用：先頭の歌手名（「キャラ名(CV:声優名)」はキャラ名、括弧だけなら空）
export function primaryArtist(artist) {
  return normalizeText(artist).split(",")[0].replace(/[(（].*$/, "").trim();
}

// 試す検索語（先頭から順に。同じ検索語は重ねない）
export function buildSongQueries(song) {
  const title = normalizeText(song.song_title);
  // ボカロ等は複数アーティストが ", " 連結されるため、検索は先頭1名のみ使う
  const artist = normalizeText(song.artist).split(",")[0].trim();
  const bare = stripVersion(song.song_title);
  const queries = [
    { term: `${title} ${artist}`.trim(), limit: 10 },
    { term: [bare, primaryArtist(song.artist)].filter(Boolean).join(" "), limit: 10 },
    // 歌手名の表記が iTunes と違うと検索に掛からないため、曲名だけでも探す（歌手は判定で確かめる）
    { term: bare, limit: 25 },
  ];
  const seen = new Set();
  return queries.filter((q) => q.term && !seen.has(q.term) && seen.add(q.term));
}

// country=JP で日本カタログを優先（アニソン/ボカロ/VTuber の精度向上）
export function itunesSearchUrl(term, limit) {
  return `${ITUNES_SEARCH_API}?term=${encodeURIComponent(term)}&entity=song&country=JP&limit=${limit}`;
}

// qts：比較する曲名（そのままの曲名と、版の表記を落とした曲名）
function titleScore(qts, trackName) {
  const rt = normForMatch(trackName || "");
  return Math.max(...qts.map((qt) => compareKeys(qt, rt)));
}

// 正規化済みの 2 つの題名の近さ（完全一致 1、部分一致 0.85、それ以外は Dice 係数）
export function compareKeys(qt, rt) {
  if (rt && rt === qt) return 1;
  // 部分一致は 3 文字以上に限る（「i」が「relations」に含まれる、のような取り違えを防ぐ）
  if (Math.min(qt.length, rt.length) >= 3 && (rt.includes(qt) || qt.includes(rt))) return 0.85;
  return similarity(qt, rt);
}

// iTunes 検索結果から最も確からしい1件を選ぶ（弱い一致・歌手違いは null）
export function pickBestSong(song, results) {
  const qts = [normForMatch(song.song_title), normForMatch(stripVersion(song.song_title))];
  let best = null;
  let bestScore = 0;
  for (const r of results) {
    if (!r.artworkUrl100) continue;
    const score = titleScore(qts, r.trackName);
    // 歌手違いは採用しない。アルバム名に作品名があっても、アニソンのカバー集・別歌手版が多い
    // （2026-10-31 の再測定で、作品名で救った 19 件のうち 10 件が誤りだった）
    if (artistMatches(song.artist, r.artistName) && score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
