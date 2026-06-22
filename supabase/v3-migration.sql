-- ZenFlow v3 Migration: User Authentication & Personal History
-- Run this in the Supabase SQL Editor.
-- FULLY NON-DESTRUCTIVE — only adds new tables/columns/indexes/policies.
-- Existing data is preserved exactly as-is.

-- ─── 1. USER PROFILES ──────────────────────────────────────────────────────
-- Links Supabase Auth users to their phone number and display name.
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile"   ON user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;

CREATE POLICY "Users read own profile"   ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- ─── 2. REGISTRATIONS — add nullable user_id ──────────────────────────────
-- Existing rows keep user_id = NULL (backward compatible).
-- New registrations by authenticated users will have user_id set.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── 3. INDEXES ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registrations_user_id
  ON registrations(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registrations_phone
  ON registrations(phone);

-- ─── 4. UPDATE POLICY FOR REGISTRATIONS ──────────────────────────────────
-- Needed for the backfill endpoint to set user_id on legacy rows.
-- (Service role bypasses RLS, but this keeps things consistent.)
DROP POLICY IF EXISTS "Public update registrations" ON registrations;
CREATE POLICY "Public update registrations" ON registrations FOR UPDATE USING (true);

-- ─── NOTES ────────────────────────────────────────────────────────────────
-- After running this SQL, in the Supabase Dashboard:
--   Authentication → Settings → Email Auth → disable "Confirm email"
--   (or configure SMTP for production email confirmation).
--
-- Enable Realtime on user_profiles if desired (optional).
