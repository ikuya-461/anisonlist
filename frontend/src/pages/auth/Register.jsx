import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { createUserProfile } from "../../lib/queries/users";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./LoginRegister.module.css";

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentYear = new Date().getFullYear();

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

    if (!userName.trim() || !email.trim() || !password.trim() || !passwordConfirm.trim() || !birthYear || !gender) {
      setErrorMessage(t("auth.err.allFields"));
      return;
    }

    const year = Number(birthYear);
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
      setErrorMessage(t("auth.err.birthRange", { year: currentYear }));
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage(t("auth.err.pwMismatch"));
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

    setSuccessMessage(t("auth.msg.signupDone"));

    const ok = await createUserProfile({ user_name: userName, birth_year: year, gender });
    if (!ok) {
      setErrorMessage(t("auth.err.profileSave"));
      return;
    }

    setTimeout(() => navigate("/login", { replace: true }), 1500);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t("auth.register.title")}</h2>

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <input
        className={styles.input}
        placeholder={t("auth.ph.userName")}
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        autoComplete="username"
      />

      <input
        className={styles.input}
        type="number"
        inputMode="numeric"
        placeholder={t("auth.ph.birthYear")}
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        min={1900}
        max={currentYear}
        autoComplete="bday-year"
      />

      <select
        className={styles.input}
        value={gender}
        onChange={(e) => setGender(e.target.value)}
      >
        <option value="">{t("auth.ph.gender")}</option>
        <option value="男性">{t("gender.male")}</option>
        <option value="女性">{t("gender.female")}</option>
        <option value="その他">{t("gender.other")}</option>
        <option value="回答しない">{t("gender.noAnswer")}</option>
      </select>

      <input
        className={styles.input}
        placeholder={t("auth.ph.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <div className={styles.passwordWrapper}>
        <input
          className={styles.input}
          placeholder={t("auth.ph.password")}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
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
        placeholder={t("auth.ph.passwordConfirm")}
        type={showPassword ? "text" : "password"}
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        autoComplete="new-password"
      />

      {password && (
        <div className={styles.strengthBox}>
          <div className={styles.strengthBar}>
            <div
              className={`${styles.strengthFill} ${
                strength <= 2
                  ? styles.strengthWeak
                  : strength === 3
                  ? styles.strengthMedium
                  : styles.strengthStrong
              }`}
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>
          <div className={styles.strengthText}>
            {strength <= 2
              ? t("auth.pw.weak")
              : strength === 3
              ? t("auth.pw.medium")
              : t("auth.pw.strong")}
          </div>
        </div>
      )}

      <button className={styles.button} onClick={handleSignUp}>
        {t("auth.btn.signup")}
      </button>

      <p className={styles.privacyNote}>
        {t("auth.privacyPre")}
        <span className={styles.link} onClick={() => navigate("/privacy")}>
          {t("auth.privacyLink")}
        </span>
        {t("auth.privacyPost")}
      </p>

      <div className={styles.subText}>
        {t("auth.haveAccount")}{" "}
        <span className={styles.link} onClick={() => navigate("/login")}>
          {t("auth.loginHere")}
        </span>
      </div>
    </div>
  );
}
