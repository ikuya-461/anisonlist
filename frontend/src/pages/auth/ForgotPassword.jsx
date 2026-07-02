import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./LoginRegister.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSend = async () => {
    setMessage("");

    if (!email.trim()) {
      setMessage(t("auth.err.emailRequired"));
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error("送信エラー:", error);
      setMessage(t("auth.err.emailInvalid"));
      return;
    }

    setMessage(t("auth.msg.resetSent"));
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t("auth.forgot.title")}</h2>

      {message && <div className={styles.error}>{message}</div>}

      <input
        className={styles.input}
        placeholder={t("auth.ph.registeredEmail")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button className={styles.button} onClick={handleSend}>
        {t("auth.btn.sendEmail")}
      </button>

      <div className={styles.subText}>
        <span className={styles.link} onClick={() => navigate("/login")}>
          {t("auth.backToLogin")}
        </span>
      </div>
    </div>
  );
}
