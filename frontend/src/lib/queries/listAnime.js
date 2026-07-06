import { supabase } from "../supabaseClient";

/* =========================================================
   アニメリスト（list_anime）のクエリ群
   - listSongs.js と同型（RLS: 公開または本人のみ閲覧、編集は本人）
   ========================================================= */

/* -------------------------------------------------------
   ★ リスト内のアニメ一覧取得（position順）
------------------------------------------------------- */
export async function getListAnime(listId) {
  const { data, error } = await supabase
    .from("list_anime")
    .select(`
      id,
      anime_id,
      position,
      memo,
      anime_tags,
      anime:anime!anime_id (
        title_jp,
        title_en,
        title_romaji,
        release_year,
        release_season,
        image_url
      )
    `)
    .eq("list_id", listId)
    .order("position", { ascending: true });

  if (error) {
    console.error("getListAnime error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    anime_id: row.anime_id,
    position: row.position,
    title_jp: row.anime?.title_jp ?? null,
    title_en: row.anime?.title_en ?? null,
    title_romaji: row.anime?.title_romaji ?? null,
    release_year: row.anime?.release_year ?? null,
    release_season: row.anime?.release_season ?? null,
    image_url: row.anime?.image_url ?? null,
    memo: row.memo ?? null,
    anime_tags: row.anime_tags ?? []
  }));
}

/* -------------------------------------------------------
   ★ アニメをリストに追加（position を自動採番）
------------------------------------------------------- */
export async function addAnimeToList(listId, animeId, { memo, anime_tags } = {}) {
  const { data: maxRow } = await supabase
    .from("list_anime")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newPosition = (maxRow?.position ?? 0) + 1;

  const record = { list_id: listId, anime_id: animeId, position: newPosition };
  if (memo)               record.memo       = memo.slice(0, 30);
  if (anime_tags?.length) record.anime_tags = anime_tags;

  const { data, error } = await supabase
    .from("list_anime")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    console.error("addAnimeToList error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ 並び替え保存（UNIQUE制約回避はRPC側で二段階更新）
------------------------------------------------------- */
export async function reorderListAnime(listId, order) {
  const { error } = await supabase.rpc("reorder_list_anime", {
    p_list_id: listId,
    p_orders: order.map((item) => ({ id: item.id, position: item.position }))
  });

  if (error) {
    console.error("reorderListAnime error:", error);
    return false;
  }

  return true;
}

/* -------------------------------------------------------
   ★ アニメをリストから削除
------------------------------------------------------- */
export async function removeAnimeFromList(listAnimeId) {
  const { error } = await supabase.from("list_anime").delete().eq("id", listAnimeId);

  if (error) {
    console.error("removeAnimeFromList error:", error);
    return false;
  }

  return true;
}
