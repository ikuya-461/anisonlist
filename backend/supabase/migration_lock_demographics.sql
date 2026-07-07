-- =========================================================
-- 生年・性別のAPI読み取りを封鎖（プライバシー保護）
--   - public.users.birth_year / gender は登録時に書き込むだけで、
--     フロント(getMyProfile/getPublicProfile)は一切読み戻していない
--   - しかし anon/authenticated に「テーブルレベル」のSELECT権限があり、
--     これは全列をカバーするため、列レベルREVOKEでは塞げない（Postgres仕様）
--   - 対策: テーブルレベルSELECTを剥がし、安全な列だけ列レベルで付与し直す
--   - INSERT/UPDATE権限は無関係なので登録・更新は従来通り動作する
--   - オーナー自身の分析は psql / service_role で読める（PostgREST権限とは別）
-- =========================================================

-- テーブルレベル(全列)SELECTを剥がす
revoke select on public.users from anon;
revoke select on public.users from authenticated;

-- 表示に必要な安全列だけを付与し直す（birth_year / gender は含めない）
grant select (id, user_name, created_at, bio, icon_url, is_public) on public.users to anon;
grant select (id, user_name, created_at, bio, icon_url, is_public) on public.users to authenticated;
