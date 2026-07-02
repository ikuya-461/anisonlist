import { supabase } from "../supabaseClient";
import { normalizeText } from "./normalize";

/* =========================================================
   アーティストの英語名(name_en)を MusicBrainz から取得しキャッシュ
   - iTunes は日本語名をそのまま返すため英語名ソースにならなかった
   - MusicBrainz は locale=en の英語エイリアス（例: 高橋洋子 → Yōko Takahashi）
     を持つため、それを name_en として採用する
   - レート制限(匿名 1req/秒)に配慮し、アーティスト詳細ページで
     1人ずつオンデマンドに取得する（検索グリッドでは叩かない）
   ========================================================= */
const MB_API = "https://musicbrainz.org/ws/2";

// 日本語（かな・カナ・漢字）を含むか
function hasJapanese(s) {
  return /[぀-ヿ一-龯]/.test(s || "");
}

// aliases から最良の英語/ラテン表記名を選ぶ
function pickEnglishName(artistJson, jpName) {
  const aliases = artistJson.aliases || [];

  // 1. locale=en かつ primary の「Artist name」
  const enPrimary = aliases.find(
    (a) => a.locale === "en" && a.primary && a.type === "Artist name" && a.name
  );
  if (enPrimary) return enPrimary.name;

  // 2. locale=en の任意エイリアス
  const enAny = aliases.find((a) => a.locale === "en" && a.name);
  if (enAny) return enAny.name;

  // 3. 日本語を含まないラテン表記の「Artist name」エイリアス
  const latinName = aliases.find(
    (a) => a.type === "Artist name" && a.name && !hasJapanese(a.name)
  );
  if (latinName) return latinName.name;

  // 4. sort-name がラテン表記なら「姓, 名」→「名 姓」に整形
  const sort = artistJson["sort-name"];
  if (sort && !hasJapanese(sort)) {
    const parts = sort.split(",").map((s) => s.trim());
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : sort;
  }

  return null;
}

/* -------------------------------------------------------
   🚀 アーティストの name_en を取得して DB に保存
   - 取得できた英語名が日本語名と同じ場合は保存しない
   - 誤ったアーティストに紐付けないよう、名前一致で確信度を担保
------------------------------------------------------- */
export async function ensureArtistNameEn(artist) {
  if (!artist || artist.name_en) return artist?.name_en ?? null;
  if (!artist.name || !hasJapanese(artist.name)) return null; // 既にラテン名なら不要

  const name = artist.name;
  try {
    // 1. 名前でアーティスト検索
    const q = encodeURIComponent(`artist:"${name}"`);
    const searchRes = await fetch(`${MB_API}/artist?query=${q}&fmt=json&limit=5`);
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const candidate = (searchJson.artists || []).find(
      (a) => normalizeText(a.name) === normalizeText(name)
    );
    if (!candidate) return null;

    // 2. エイリアス付きで取得
    const detailRes = await fetch(`${MB_API}/artist/${candidate.id}?inc=aliases&fmt=json`);
    if (!detailRes.ok) return null;
    const detailJson = await detailRes.json();

    // 確信度チェック：取得アーティストの ja 名 or name が我々の名前と一致するか
    const jaMatch =
      normalizeText(detailJson.name) === normalizeText(name) ||
      (detailJson.aliases || []).some(
        (a) => a.locale === "ja" && normalizeText(a.name) === normalizeText(name)
      );
    if (!jaMatch) return null;

    const nameEn = pickEnglishName(detailJson, name);
    if (!nameEn || normalizeText(nameEn) === normalizeText(name)) return null;

    await supabase.from("artists").update({ name_en: nameEn }).eq("id", artist.id);
    return nameEn;
  } catch (err) {
    console.error("artistNameCache(MusicBrainz) error:", err);
    return null;
  }
}
