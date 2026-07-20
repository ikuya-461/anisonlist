import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";
import { ITUNES_SEARCH_API } from "../constants";

// 採用に必要な最低スコア（songImageCache/gameImageCache/animeImageCacheと同じ閾値）
const MATCH_THRESHOLD = 0.72;

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

// 曲検索結果の artistName から最も近いものをスコアリングで選ぶ
function pickBestArtistMatch(queryName, results) {
  const qn = normalizeText(queryName);

  let best = null;
  let bestScore = 0;

  for (const r of results) {
    if (!r.artworkUrl100) continue;

    const rn = normalizeText(r.artistName || "");
    let score;
    if (rn && rn === qn) score = 1;
    else if (qn && rn && (rn.includes(qn) || qn.includes(rn))) score = 0.85;
    else score = similarity(qn, rn);

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/* -------------------------------------------------------
   🚀 アーティスト画像を iTunes(JP) から取得し DB にキャッシュ
   - iTunes の musicArtist には artwork が無いため、
     そのアーティスト名で曲を検索し、artistName が一致する
     曲のジャケットをアーティスト画像として採用する
   - 複数候補を類似度スコアリングし、閾値未満は不採用（誤った画像を付けない）
------------------------------------------------------- */
export async function ensureArtistImage(artist) {
  if (!artist) return null;
  if (artist.image_url) return artist.image_url;
  if (!artist.name) return null;

  const name = normalizeText(artist.name);
  const url = `${ITUNES_SEARCH_API}?term=${encodeURIComponent(name)}&entity=song&country=JP&limit=10`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const match = pickBestArtistMatch(artist.name, data?.results ?? []);
    if (!match) return null;

    const artwork = match.artworkUrl100.replace("100x100", "600x600");

    await supabase.from("artists").update({ image_url: artwork }).eq("id", artist.id);

    return artwork;
  } catch (err) {
    console.error("artistImageCache error:", err);
    return null;
  }
}

// 並列数を制限しながら順序を保ってアーティスト画像を補完する
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function ensureArtistImages(artists) {
  return mapWithConcurrency(artists, 6, async (artist) => {
    if (artist.image_url) return artist;
    const image_url = await ensureArtistImage(artist);
    return { ...artist, image_url };
  });
}
