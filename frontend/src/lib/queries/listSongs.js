import { supabase } from "../supabaseClient";

/* -------------------------------------------------------
   ★ リスト内の曲一覧取得（position順）
   ※ RLSで本人のリストのみ参照可能
------------------------------------------------------- */
export async function getListSongs(listId) {
  const { data, error } = await supabase
    .from("list_songs")
    .select(`
      id,
      song_id,
      position,
      memo,
      emotion_tags,
      encounter_type,
      song:songs!song_id (
        song_title,
        song_type,
        image_url,
        artist:artists!artist_id ( name ),
        anime:anime!anime_id ( title_jp )
      )
    `)
    .eq("list_id", listId)
    .order("position", { ascending: true });

  if (error) {
    console.error("getListSongs error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    song_id: row.song_id,
    position: row.position,
    song_title: row.song?.song_title ?? null,
    song_type: row.song?.song_type ?? null,
    image_url: row.song?.image_url ?? null,
    artist: row.song?.artist?.name ?? null,
    anime_title: row.song?.anime?.title_jp ?? null,
    memo: row.memo ?? null,
    emotion_tags: row.emotion_tags ?? [],
    encounter_type: row.encounter_type ?? null
  }));
}

/* -------------------------------------------------------
   ★ 曲をリストに追加（position を自動採番）
------------------------------------------------------- */
export async function addSongToList(listId, songId, { memo, emotion_tags, encounter_type } = {}) {
  const { data: maxRow } = await supabase
    .from("list_songs")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newPosition = (maxRow?.position ?? 0) + 1;

  const record = { list_id: listId, song_id: songId, position: newPosition };
  if (memo)          record.memo           = memo.slice(0, 30);
  if (emotion_tags?.length) record.emotion_tags  = emotion_tags;
  if (encounter_type) record.encounter_type = encounter_type;

  const { data, error } = await supabase
    .from("list_songs")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    console.error("addSongToList error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ 並び替え保存（position の一意制約を避けるための
      二段階更新を Postgres 関数 reorder_list_songs で実行）
------------------------------------------------------- */
export async function reorderListSongs(listId, order) {
  const { error } = await supabase.rpc("reorder_list_songs", {
    p_list_id: listId,
    p_orders: order.map((item) => ({ id: item.id, position: item.position }))
  });

  if (error) {
    console.error("reorderListSongs error:", error);
    return false;
  }

  return true;
}

/* -------------------------------------------------------
   ★ 曲をリストから削除
------------------------------------------------------- */
export async function removeSongFromList(listSongId) {
  const { error } = await supabase.from("list_songs").delete().eq("id", listSongId);

  if (error) {
    console.error("removeSongFromList error:", error);
    return false;
  }

  return true;
}
