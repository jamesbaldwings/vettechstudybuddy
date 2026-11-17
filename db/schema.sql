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
