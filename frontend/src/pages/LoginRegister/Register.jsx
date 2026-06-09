import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { createUserProfile } from "../../lib/queries/users";
import { useNavigate } from "react-router-dom";
import styles from "../../CSS/PageCSS/LoginRegister.module.css";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const getPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) navigate("/mypage", { replace: true });
    };
    check();
  }, [navigate]);

  const handleSignUp = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userName.trim() || !email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setErrorMessage("すべての項目を入力してください");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("パスワードが一致していません");
      return;
    }

    // Supabase でユーザー作成
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("登録失敗:", error);
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("登録が完了しました。メールを確認してください。");

    const ok = await createUserProfile({ user_name: userName });
    if (!ok) {
      setErrorMessage("ユーザー情報の保存に失敗しました");
      return;
    }

    setTimeout(() => navigate("/login", { replace: true }), 1500);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>新規登録</h2>

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <input
        className={styles.input}
        placeholder="ユーザー名"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />

      <input
        className={styles.input}
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className={styles.passwordWrapper}>
        <input
          className={styles.input}
          placeholder="パスワード"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span
          className={styles.eye}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "🙈" : "👁"}
        </span>
      </div>

      <input
        className={styles.input}
        placeholder="パスワード（確認）"
        type={showPassword ? "text" : "password"}
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      />

      {password && (
        <div className={styles.strengthBox}>
          <div className={styles.strengthBar}>
            <div
              className={styles.strengthFill}
              style={{
                width: `${(strength / 5) * 100}%`,
                background:
                  strength <= 2 ? "red" : strength === 3 ? "orange" : "green",
              }}
            />
          </div>
          <div className={styles.strengthText}>
            {strength <= 2
              ? "弱いパスワードです"
              : strength === 3
              ? "普通の強さです"
              : "強いパスワードです"}
          </div>
        </div>
      )}

      <button className={styles.button} onClick={handleSignUp}>
        登録する
      </button>

      <div className={styles.subText}>
        すでにアカウントをお持ちの方は{" "}
        <span className={styles.link} onClick={() => navigate("/login")}>
          ログインはこちら
        </span>
      </div>
    </div>
  );
}
