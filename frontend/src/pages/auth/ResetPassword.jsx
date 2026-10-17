import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useLanguage } from "../../contexts/LanguageContext";
import { validateNewPassword, resetErrorKey } from "../../lib/passwordReset";
import styles from "./LoginRegister.module.css";

/* =========================================================
   新しいパスワードの設定（再設定メールのリンク先）
   - リンクの URL に付いたトークンは supabase-js が読み取り、
     一時的なログイン状態（リカバリーセッション）を作る
   - セッションが無い＝リンクの期限切れ・使用済み・直接アクセス
   ========================================================= */

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // checking → ready（入力可）/ invalid（リンク無効）→ done（変更完了）
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    // getSession は URL のトークン処理が終わるのを待ってから返る
    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? "ready" : "invalid");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && active) setStatus("ready");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setMessage("");

    const errKey = validateNewPassword(password, passwordConfirm);
    if (errKey) {
      setMessage(t(errKey));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      console.error("パスワード更新エラー:", error);
      setMessage(t(resetErrorKey(error)));
      return;
    }

    setStatus("done");
    setTimeout(() => navigate("/mypage", { replace: true }), 1500);
  };

  if (status === "checking") return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t("auth.reset.title")}</h2>

      {status === "invalid" && (
        <>
          <div className={styles.error}>{t("auth.err.resetLinkInvalid")}</div>
          <button className={styles.button} onClick={() => navigate("/forgot-password")}>
            {t("auth.btn.sendReset")}
          </button>
        </>
      )}

      {status === "done" && <div className={styles.error}>{t("auth.msg.resetDone")}</div>}

      {status === "ready" && (
        <>
          {message && <div className={styles.error}>{message}</div>}

          <div className={styles.passwordWrapper}>
            <input
              className={styles.input}
              placeholder={t("auth.ph.newPassword")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <span className={styles.eye} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "🙈" : "👁"}
            </span>
          </div>

          <input
            className={styles.input}
            placeholder={t("auth.ph.passwordConfirm")}
            type={showPassword ? "text" : "password"}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />

          <button className={styles.button} onClick={handleSubmit} disabled={submitting}>
            {t("auth.btn.updatePassword")}
          </button>
        </>
      )}
    </div>
  );
}
