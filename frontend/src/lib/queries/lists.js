import { supabase } from "../supabaseClient";

/* -------------------------------------------------------
   ★ 新規リスト作成
------------------------------------------------------- */
export async function createList(userId, name) {
  const { data, error } = await supabase
    .from("lists")
    .insert({ user_id: userId, name })
    .select("id, user_id, name, created_at")
    .single();

  if (error) {
    console.error("createList error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ リスト1件取得（リスト名取得）
------------------------------------------------------- */
export async function getListDetail(listId) {
  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (error) {
    console.error("getListDetail error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ 自分のリスト一覧取得
   （各リストの先頭曲の image_url / song_type をプレビュー表示用に取得）
------------------------------------------------------- */
export async function getMyLists() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: lists, error } = await supabase
    .from("lists")
    .select("id, user_id, name, created_at, position")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    console.error("getMyLists error:", error);
    return [];
  }

  return Promise.all(
    (lists ?? []).map(async (list) => {
      const { data: previewRows } = await supabase
        .from("list_songs")
        .select("song:songs!song_id ( image_url, song_type )")
        .eq("list_id", list.id)
        .order("position", { ascending: true })
        .limit(1);

      const preview = previewRows?.[0]?.song ?? null;

      return {
        ...list,
        image_url: preview?.image_url ?? null,
        song_type: preview?.song_type ?? null
      };
    })
  );
}

/* -------------------------------------------------------
   ★ リスト名変更（本人確認込み）
------------------------------------------------------- */
export async function renameList(listId, name) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("lists")
    .update({ name })
    .eq("id", listId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("renameList error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ リスト削除（本人確認込み・list_songsもまとめて削除）
------------------------------------------------------- */
export async function deleteList(listId) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: owned } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!owned) return false;

  await supabase.from("list_songs").delete().eq("list_id", listId);
  const { error } = await supabase.from("lists").delete().eq("id", listId);

  if (error) {
    console.error("deleteList error:", error);
    return false;
  }

  return true;
}
