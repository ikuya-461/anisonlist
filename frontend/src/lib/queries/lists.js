import { supabase } from "../supabaseClient";

/* -------------------------------------------------------
   ★ 新規リスト作成
------------------------------------------------------- */
export async function createList(name, listType = "song") {
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
    .insert({ user_id: user.id, name, position: nextPosition, list_type: listType })
    .select("id, user_id, name, created_at, position, list_type")
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
    .select("id, name, description, user_id, position, is_public, created_at, list_type")
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
    .select("id, user_id, name, created_at, position, is_public, list_type")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    console.error("getMyLists error:", error);
    return [];
  }

  return Promise.all(
    (lists ?? []).map(async (list) => {
      // プレビュー画像はリストタイプに応じて先頭アイテムから取得
      let preview = null;
      if (list.list_type === "anime") {
        const { data: previewRows } = await supabase
          .from("list_anime")
          .select("anime:anime!anime_id ( image_url )")
          .eq("list_id", list.id)
          .order("position", { ascending: true })
          .limit(1);
        preview = previewRows?.[0]?.anime ?? null;
      } else {
        const { data: previewRows } = await supabase
          .from("list_songs")
          .select("song:songs!song_id ( image_url, song_type )")
          .eq("list_id", list.id)
          .order("position", { ascending: true })
          .limit(1);
        preview = previewRows?.[0]?.song ?? null;
      }

      const { count: likeCount } = await supabase
        .from("list_likes")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id);

      return {
        ...list,
        image_url: preview?.image_url ?? null,
        song_type: preview?.song_type ?? null,
        like_count: likeCount ?? 0
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
   ★ リスト説明文更新
------------------------------------------------------- */
export async function updateListDescription(listId, description) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("lists")
    .update({ description })
    .eq("id", listId)
    .eq("user_id", user.id)
    .select("description")
    .single();

  if (error) { console.error("updateListDescription error:", error); return null; }
  return data;
}

/* -------------------------------------------------------
   ★ 公開リスト1件取得（/public/:id 用）
------------------------------------------------------- */
export async function getPublicListDetail(listId) {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, description, user_id, is_public, list_type")
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
    .select("id, name, position, list_type")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("position", { ascending: true });

  if (error) {
    console.error("getPublicListsByUser error:", error);
    return [];
  }

  // 各リストの先頭アイテムのサムネイルを取得（曲/アニメで参照先を切替）
  return Promise.all(
    (data ?? []).map(async (list) => {
      let preview = null;
      if (list.list_type === "anime") {
        const { data: previewRows } = await supabase
          .from("list_anime")
          .select("anime:anime!anime_id ( image_url )")
          .eq("list_id", list.id)
          .order("position", { ascending: true })
          .limit(1);
        preview = previewRows?.[0]?.anime ?? null;
      } else {
        const { data: previewRows } = await supabase
          .from("list_songs")
          .select("song:songs!song_id ( image_url, song_type )")
          .eq("list_id", list.id)
          .order("position", { ascending: true })
          .limit(1);
        preview = previewRows?.[0]?.song ?? null;
      }

      const { count: likeCount } = await supabase
        .from("list_likes")
        .select("*", { count: "exact", head: true })
        .eq("list_id", list.id);

      return {
        ...list,
        image_url: preview?.image_url ?? null,
        like_count: likeCount ?? 0
      };
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
