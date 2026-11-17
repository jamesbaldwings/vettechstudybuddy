-- Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  first_name text,
  exam_date date,
  target_month date,             -- first day of the month they plan to test, when no date is booked yet
  consent_at timestamptz NOT NULL,
  unsubscribed_at timestamptz,
  outcome text CHECK (outcome IN ('passed','failed')),
  outcome_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_lower ON leads (lower(email));

CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token text UNIQUE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  confidence int,
  answers jsonb,
  score int,
  domain_scores jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS attempts_lead ON attempts (lead_id);

-- Every pass/fail/not-yet report, so retakes keep their history.
CREATE TABLE IF NOT EXISTS outcome_reports (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('passed','failed','not_yet')),
  exam_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per email per lead. The unique key stops duplicates if the cron runs twice.
CREATE TABLE IF NOT EXISTS email_log (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL,          -- sent | dry_run | error
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, kind)
);

-- Voice sessions with Sara, for daily limits and to look up transcripts in ElevenLabs.
CREATE TABLE IF NOT EXISTS voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES attempts(id) ON DELETE SET NULL,
  conversation_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS voice_sessions_lead_day ON voice_sessions (lead_id, started_at);

-- ===== Platform (accounts, passes, practice) =====

-- Sign-in links (only a hash of the token is stored) and browser sessions.
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash text PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  next_path text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (
  id_hash text PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_ok boolean NOT NULL DEFAULT true;

-- Passes bought (or granted). The 90 days start when the student presses Start.
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  plan text NOT NULL,                 -- exam_pass | final_stretch | retake_pass | extra_voice
  amount_cents int NOT NULL DEFAULT 0,
  founding boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'stripe', -- stripe | comp | school
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  status text NOT NULL DEFAULT 'paid',   -- paid | refunded
  access_days int NOT NULL DEFAULT 0,
  voice_minutes int NOT NULL DEFAULT 0,
  activate_by timestamptz,
  activated_at timestamptz,
  expires_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchases_lead ON purchases (lead_id);

-- Voice minutes: credits (+) and usage (-). Balance = sum.
CREATE TABLE IF NOT EXISTS voice_ledger (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  minutes numeric(8,2) NOT NULL,
  reason text NOT NULL,               -- free_trial | pass:<id> | extra:<id> | session:<id> | comp
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS voice_ledger_reason ON voice_ledger (lead_id, reason);
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'voice';
ALTER TABLE voice_sessions ADD COLUMN IF NOT EXISTS minutes_charged numeric(8,2);

-- Question bank. Only 'reviewed' questions are shown to students.
CREATE TABLE IF NOT EXISTS questions (
  id text PRIMARY KEY,
  domain text NOT NULL,
  stem text NOT NULL,
  options jsonb NOT NULL,
  answer int NOT NULL,
  explanation text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','retired')),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_domain_status ON questions (domain, status);

CREATE TABLE IF NOT EXISTS practice_answers (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chosen int,
  correct boolean NOT NULL,
  mode text NOT NULL,                 -- practice | exam | diagnostic
  exam_id uuid,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS practice_answers_lead ON practice_answers (lead_id, answered_at);

CREATE TABLE IF NOT EXISTS practice_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  question_ids jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_limit_sec int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  score int,
  total int,
  domain_scores jsonb
);

CREATE TABLE IF NOT EXISTS question_reports (
  id bigserial PRIMARY KEY,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  question_id text NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'open',  -- open | resolved
  created_at timestamptz NOT NULL DEFAULT now()
);
