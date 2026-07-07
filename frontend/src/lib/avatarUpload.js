import { supabase } from "./supabaseClient";

/* =========================================================
   ユーザーアバター画像アップロード
   - クライアント側でリサイズ(最大400x400)+JPEG圧縮してからアップロード
   - パスは {user_id}/icon.jpg 固定（upsertで上書き、ゴミファイルを残さない）
   - 同一パスのままだとCDN/ブラウザキャッシュが古い画像を返すことがあるため、
     保存するURLには ?t=タイムスタンプ を付けてキャッシュバストする
   ========================================================= */

const MAX_SIZE = 400;
const JPEG_QUALITY = 0.85;

// 画像ファイルを読み込み、最大400x400に収まるようリサイズしてJPEG Blobにする
function resizeToJpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const scale = MAX_SIZE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // 透過PNG対策（JPEGは透過非対応）
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = url;
  });
}

/**
 * アバター画像をアップロードし、公開URL（キャッシュバスト付き）を返す
 * @param {File} file 画像ファイル（input type="file" から）
 * @returns {Promise<string|null>} 公開URL、失敗時はnull
 */
export async function uploadAvatar(file) {
  if (!file || !file.type.startsWith("image/")) {
    console.error("uploadAvatar: 画像ファイルではありません");
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let blob;
  try {
    blob = await resizeToJpeg(file);
  } catch (err) {
    console.error("uploadAvatar resize error:", err);
    return null;
  }

  const path = `${user.id}/icon.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    console.error("uploadAvatar upload error:", uploadError);
    return null;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  if (!data?.publicUrl) return null;

  // 固定パスのままだとキャッシュされた古い画像が表示され続けるためバストする
  return `${data.publicUrl}?t=${Date.now()}`;
}
