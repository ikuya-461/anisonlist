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
    .select("id, user_name, bio, icon_url, is_public")
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
export async function createUserProfile({ user_name, bio = "", icon_url = "", birth_year = null, gender = null }) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from("users")
    .insert({ id: user.id, user_name, bio, icon_url, birth_year, gender });

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
    .select("id, user_name, bio, icon_url, is_public")
    .single();

  if (error) {
    console.error("updateMyProfile error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ 他人の公開プロフィール取得
------------------------------------------------------- */
export async function getPublicProfile(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, user_name, bio, icon_url")
    .eq("id", userId)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("getPublicProfile error:", error);
    return null;
  }

  return data;
}

/* -------------------------------------------------------
   ★ プロフィール公開 / 非公開 トグル
------------------------------------------------------- */
export async function toggleProfilePublic(currentValue) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .update({ is_public: !currentValue })
    .eq("id", user.id)
    .select("is_public")
    .single();

  if (error) {
    console.error("toggleProfilePublic error:", error);
    return null;
  }

  return data.is_public;
}

/* -------------------------------------------------------
   ★ アカウント削除（ストア審査要件）
   - RPC(delete_my_account)が本人のauth.users+全関連データを削除
   - 成功したらセッションも破棄する
------------------------------------------------------- */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");

  if (error) {
    console.error("deleteMyAccount error:", error);
    return false;
  }

  await supabase.auth.signOut();
  return true;
}
