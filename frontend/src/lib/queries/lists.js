import { supabase } from "../supabaseClient";

/* -------------------------------------------------------
   ★ 新規リスト作成
------------------------------------------------------- */
export async function createList(name) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 次の position = 現在の最大 + 1（先頭からソートされた並びを維持）
  const { data: maxData } = await supabase
    .from("lists")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = maxData?.[0]?.position + 1 || 0;

  const { data, error } = await supabase
    .from("lists")
    .insert({ user_id: user.id, name, position: nextPosition })
    .select("id, user_id, name, created_at, position")
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
    .select("id, user_id, name, created_at, position, is_public")
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
   ★ 公開リスト1件取得（/public/:id 用）
------------------------------------------------------- */
export async function getPublicListDetail(listId) {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, user_id, is_public")
    .eq("id", listId)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("getPublicListDetail error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ ユーザーの公開リスト一覧（/user/:userId 用）
------------------------------------------------------- */
export async function getPublicListsByUser(userId) {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, position")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("getPublicListsByUser error:", error);
    return [];
  }

  // 各リストの先頭曲サムネイルを取得
  return Promise.all(
    (data ?? []).map(async (list) => {
      const { data: previewRows } = await supabase
        .from("list_songs")
        .select("song:songs!song_id ( image_url, song_type )")
        .eq("list_id", list.id)
        .order("position", { ascending: true })
        .limit(1);

      const preview = previewRows?.[0]?.song ?? null;
      return { ...list, image_url: preview?.image_url ?? null };
    })
  );
}

/* -------------------------------------------------------
   ★ リスト公開 / 非公開 トグル
------------------------------------------------------- */
export async function toggleListPublic(listId, currentValue) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("lists")
    .update({ is_public: !currentValue })
    .eq("id", listId)
    .eq("user_id", user.id)
    .select("is_public")
    .single();

  if (error) {
    console.error("toggleListPublic error:", error);
    return null;
  }

  return data.is_public;
}

/* -------------------------------------------------------
   ★ リストいいね：件数取得 + 自分がいいね済みか
------------------------------------------------------- */
export async function getListLikeStatus(listId) {
  const { data: { user } } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("list_likes")
    .select("*", { count: "exact", head: true })
    .eq("list_id", listId);

  let liked = false;
  if (user) {
    const { data } = await supabase
      .from("list_likes")
      .select("list_id")
      .eq("list_id", listId)
      .eq("user_id", user.id)
      .maybeSingle();
    liked = !!data;
  }

  return { count: count ?? 0, liked };
}

/* -------------------------------------------------------
   ★ リストいいね：トグル（いいね ↔ 解除）
------------------------------------------------------- */
export async function toggleListLike(listId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("list_likes")
    .select("list_id")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("list_likes")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", user.id);
    return false; // いいね解除
  } else {
    await supabase
      .from("list_likes")
      .insert({ list_id: listId, user_id: user.id });
    return true; // いいね追加
  }
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
