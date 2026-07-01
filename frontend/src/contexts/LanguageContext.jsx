import { createContext, useContext, useState, useEffect, useCallback } from "react";

/* =========================================================
   表示言語コンテキスト（ja / en）
   - localStorage に永続化
   - 英語(en)時は英題/英語名を優先し、無ければ日本語にフォールバック
   ========================================================= */
const LanguageContext = createContext({
  lang: "ja",
  setLang: () => {},
  toggleLang: () => {}
});

const STORAGE_KEY = "soniclist:lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return "ja";
    return window.localStorage.getItem(STORAGE_KEY) || "ja";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage 不可環境では無視 */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next === "en" ? "en" : "ja");
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "en" ? "ja" : "en"));
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
