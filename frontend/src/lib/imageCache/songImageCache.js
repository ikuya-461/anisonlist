import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { ITUNES_SEARCH_API } from "../constants";

// 採用に必要な最低スコア（タイトル一致が主、これ未満なら誤画像を防ぐため不採用）
const MATCH_THRESHOLD = 0.72;

// 比較用にタイトルを正規化（括弧書き・"- xxx" 等の付帯情報を落として記号も除去）
function normForMatch(str) {
  return normalizeText(str)
    .replace(/[([{（【「].*?[)\]}）】」]/g, "") // 括弧書き（Instrumental 等）を除去
    .replace(/\s*[-–—]\s.*$/, "")              // 「 - 〇〇 ver.」等の後置を除去
    .replace(/(?:feat|ft)\.?.*$/i, "")          // feat. 以降を除去
    .replace(/[!！?？。、,.\-_/~〜・:：'"’”]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// 文字バイグラムの Dice 係数（0〜1）で文字列類似度を測る
function similarity(a, b) {
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

// iTunes 検索結果から最も確からしい1件を選ぶ（弱い一致は null）
function pickBestMatch(queryTitle, queryArtist, results) {
  const qt = normForMatch(queryTitle);
  const qa = normalizeText(queryArtist);

  let best = null;
  let bestScore = 0;

  for (const r of results) {
    if (!r.artworkUrl100) continue;

    const rt = normForMatch(r.trackName || "");
    let titleScore;
    if (rt && rt === qt) titleScore = 1;
    else if (qt && rt && (rt.includes(qt) || qt.includes(rt))) titleScore = 0.85;
    else titleScore = similarity(qt, rt);

    const ra = normalizeText(r.artistName || "");
    const artistMatch = qa && ra && (ra.includes(qa) || qa.includes(ra));
    const artistBonus = artistMatch ? 0.18 : 0;

    const score = titleScore + artistBonus;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/* -------------------------------------------------------
   🚀 曲画像を iTunes API で検索し、未キャッシュなら DB に保存
   - 複数候補を取得し、タイトル類似度＋アーティスト一致でスコアリング
   - 閾値未満は採用せず null（誤った画像を付けるより NO IMAGE を選ぶ）
------------------------------------------------------- */
export async function ensureSongImage(song) {
  if (song.image_url) return song.image_url;
  if (!song.song_title || !song.artist) return null;

  const title = normalizeText(song.song_title);
  // ボカロ等は複数アーティストが ", " 連結されるため、検索は先頭1名のみ使う
  const artist = normalizeText(song.artist).split(",")[0].trim();

  const query = encodeURIComponent(`${title} ${artist}`);
  // country=JP で日本カタログを優先（アニソン/ボカロ/VTuber の精度向上）
  const url = `${ITUNES_SEARCH_API}?term=${query}&entity=song&country=JP&limit=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const match = pickBestMatch(song.song_title, artist, data?.results ?? []);
    if (!match) return null;

    const artwork = match.artworkUrl100.replace("100x100", "600x600");

    await supabase
      .from("songs")
      .update({ image_url: artwork })
      .eq("id", song.song_id ?? song.id);

    return artwork;
  } catch (err) {
    console.error("songImageCache error:", err);
    return null;
  }
}

/* -------------------------------------------------------
   🚀 曲一覧の中で image_url が無いものをまとめてキャッシュ
------------------------------------------------------- */
// 並列数を制限しながら順序を保って map する
// （アーティスト詳細で最大100曲を一度に処理する際、iTunes へ同時大量
//   リクエストを投げるとレート制限/接続枯渇で取りこぼすため）
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export async function ensureSongImages(songs) {
  return mapWithConcurrency(songs, 6, async (song) => {
    if (song.image_url) return song;
    const image_url = await ensureSongImage(song);
    return { ...song, image_url };
  });
}
