/* =========================================================
   画像プロキシ（Netlify Function）
   - AniList / RAWG の画像CDNは CORS ヘッダーを返さないため、
     ブラウザの canvas に描画すると「canvas汚染」で toBlob が失敗する。
   - ここで画像バイトを中継し Access-Control-Allow-Origin を付与する。
   - SSRF防止のため、許可したホストのみ中継する。
   ========================================================= */

// 許可する画像CDNホスト（末尾一致）
const ALLOWED_SUFFIXES = [
  ".anilist.co",   // アニメジャケット (s1〜s4.anilist.co)
  ".rawg.io",      // ゲームジャケット (media.rawg.io)
  ".mzstatic.com"  // iTunesジャケット (is1〜is5-ssl.mzstatic.com) 予備
];

exports.handler = async (event) => {
  const raw = event.queryStringParameters && event.queryStringParameters.url;
  if (!raw) {
    return { statusCode: 400, body: "missing url" };
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    return { statusCode: 400, body: "invalid url" };
  }

  const allowed =
    target.protocol === "https:" &&
    ALLOWED_SUFFIXES.some((suf) => target.hostname.endsWith(suf));
  if (!allowed) {
    return { statusCode: 403, body: "host not allowed" };
  }

  try {
    const res = await fetch(target, { redirect: "follow" });
    if (!res.ok) {
      return { statusCode: res.status, body: "upstream error" };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return { statusCode: 415, body: "not an image" };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        // CDN側の画像は不変なので長めにキャッシュ（Netlify Edgeにも乗る）
        "Cache-Control": "public, max-age=604800, immutable"
      },
      body: buf.toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 502, body: "proxy fetch failed" };
  }
};
