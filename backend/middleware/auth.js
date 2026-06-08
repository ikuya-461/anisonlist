// backend/middleware/auth.js
import { supabase } from "../supabaseClient.js";

export default async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user; // user.id に Supabase の UUID が入る
    next();
  } catch (err) {
    console.error("❌ auth middleware error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
