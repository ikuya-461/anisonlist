import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import styles from "../../CSS/PageCSS/LoginRegister.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSend = async () => {
    setMessage("");

    if (!email.trim()) {
      setMessage("メールアドレスを入力してください");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error("送信エラー:", error);
      setMessage("メールアドレスが正しくありません");
      return;
    }

    setMessage("パスワード再設定用のメールを送信しました");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>パスワード再設定</h2>

      {message && <div className={styles.error}>{message}</div>}

      <input
        className={styles.input}
        placeholder="登録したメールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button className={styles.button} onClick={handleSend}>
        メールを送信
      </button>

      <div className={styles.subText}>
        <span className={styles.link} onClick={() => navigate("/login")}>
          ログイン画面に戻る
        </span>
      </div>
    </div>
  );
}
