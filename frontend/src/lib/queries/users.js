import { supabase } from "../supabaseClient";

/* -------------------------------------------------------
   ★ 自分のプロフィール取得
------------------------------------------------------- */
export async function getMyProfile() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, user_name, bio, icon_url")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("getMyProfile error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ ユーザー登録（Supabase signUp 後に呼ぶ）
------------------------------------------------------- */
export async function createUserProfile({ user_name, bio = "", icon_url = "" }) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from("users")
    .insert({ id: user.id, user_name, bio, icon_url });

  if (error) {
    console.error("createUserProfile error:", error);
    return false;
  }

  return true;
}

/* -------------------------------------------------------
   ★ 自分のプロフィール更新
------------------------------------------------------- */
export async function updateMyProfile({ user_name, bio, icon_url }) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const updates = {};
  if (user_name !== undefined) updates.user_name = user_name;
  if (bio !== undefined) updates.bio = bio;
  if (icon_url !== undefined) updates.icon_url = icon_url;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select("id, user_name, bio, icon_url")
    .single();

  if (error) {
    console.error("updateMyProfile error:", error);
    return null;
  }

  return data;
}
