CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS khatm_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_cycle INTEGER NOT NULL DEFAULT 1 CHECK (current_cycle > 0),
  completed_khatms INTEGER NOT NULL DEFAULT 0 CHECK (completed_khatms >= 0),
  intention TEXT NOT NULL DEFAULT 'برای سلامتی و عاقبت‌به‌خیری همه عزیزان',
  intention_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO khatm_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS verse_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle INTEGER NOT NULL CHECK (cycle > 0),
  ayah_number INTEGER NOT NULL CHECK (ayah_number BETWEEN 1 AND 6236),
  session_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('assigned', 'completed', 'expired')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  CONSTRAINT completed_timestamp_consistency CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_claim_per_ayah
ON verse_claims (cycle, ayah_number)
WHERE status = 'assigned';

CREATE UNIQUE INDEX IF NOT EXISTS one_completion_per_ayah
ON verse_claims (cycle, ayah_number)
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS verse_claims_session_active_idx
ON verse_claims (session_id, cycle, status);

CREATE INDEX IF NOT EXISTS verse_claims_expiry_idx
ON verse_claims (status, expires_at)
WHERE status = 'assigned';

CREATE TABLE IF NOT EXISTS khatm_history (
  cycle INTEGER PRIMARY KEY,
  intention TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
