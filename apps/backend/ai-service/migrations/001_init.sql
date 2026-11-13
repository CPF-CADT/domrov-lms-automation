CREATE TABLE IF NOT EXISTS evaluations (
  evaluation_id UUID PRIMARY KEY,
  submission_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  language VARCHAR(64) NOT NULL,
  resource_key TEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  score DOUBLE PRECISION,
  feedback TEXT NOT NULL DEFAULT '',
  error_code VARCHAR(64) NOT NULL DEFAULT '',
  request_id VARCHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON evaluations(submission_id);

CREATE TABLE IF NOT EXISTS evaluation_logs (
  id SERIAL PRIMARY KEY,
  evaluation_id UUID NOT NULL,
  submission_id UUID NOT NULL,
  event VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluation_logs_evaluation ON evaluation_logs(evaluation_id);
