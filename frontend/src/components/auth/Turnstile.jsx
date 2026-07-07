import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { TURNSTILE_SITE_KEY } from "../../lib/turnstile";

/* =========================================================
   Cloudflare Turnstile ウィジェット（bot対策CAPTCHA）
   - onVerify(token) でトークンを親に渡す。認証呼び出しに captchaToken として付ける
   - トークンは単回使用なので、認証失敗時に ref.reset() で取り直す
   - Supabase側のCAPTCHAが未有効の間は、トークンを送っても無害（無視される）
   ========================================================= */
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

// スクリプトを1度だけ読み込む
function loadTurnstileScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const Turnstile = forwardRef(function Turnstile({ onVerify, onExpire }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  // コールバックはrefで持ち、ウィジェットは初回1回だけ生成する
  const cbRef = useRef({ onVerify, onExpire });
  cbRef.current = { onVerify, onExpire };

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current != null) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current != null) return; // 二重生成ガード
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => cbRef.current.onVerify?.(token),
          "expired-callback": () => { cbRef.current.onVerify?.(""); cbRef.current.onExpire?.(); },
          "error-callback": () => cbRef.current.onVerify?.(""),
        });
      })
      .catch(() => { /* スクリプト読込失敗時は静かに諦める（可用性優先） */ });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current != null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ margin: "4px 0" }} />;
});

export default Turnstile;
