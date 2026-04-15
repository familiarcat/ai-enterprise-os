-- =================================================================
-- Billing Domain — Token Usage Migration
-- =================================================================

CREATE TABLE IF NOT EXISTS public.token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL UNIQUE,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  quota_limit BIGINT NOT NULL DEFAULT 1000000,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index for project lookups used in getProjectUsage
CREATE INDEX IF NOT EXISTS token_usage_project_id_idx ON public.token_usage (project_id);

-- Enable RLS and restrict to service_role (backend orchestrator)
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orchestrator full access" ON public.token_usage
  USING (auth.role() = 'service_role');

-- Automated timestamp maintenance
CREATE OR REPLACE FUNCTION update_token_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_token_usage_timestamp
BEFORE UPDATE ON public.token_usage
FOR EACH ROW
EXECUTE FUNCTION update_token_usage_timestamp();