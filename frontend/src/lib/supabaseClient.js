import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("❌ ERROR: REACT_APP_SUPABASE_URL が .env に設定されていません");
}
if (!supabaseAnonKey) {
  console.error("❌ ERROR: REACT_APP_SUPABASE_ANON_KEY が .env に設定されていません");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
