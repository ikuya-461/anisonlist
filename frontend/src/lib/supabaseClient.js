import { createClient } from "@supabase/supabase-js";
import { recoveryRedirectPath } from "./passwordReset";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("❌ ERROR: REACT_APP_SUPABASE_URL が .env に設定されていません");
}
if (!supabaseAnonKey) {
  console.error("❌ ERROR: REACT_APP_SUPABASE_ANON_KEY が .env に設定されていません");
}

// 再設定リンクが別のページに着いたら、クライアント生成（URL のトークン読み取り）より前に
// 設定画面のパスへ差し替える
const recoveryPath = recoveryRedirectPath(window.location.pathname, window.location.hash);
if (recoveryPath) window.history.replaceState(null, "", recoveryPath);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
