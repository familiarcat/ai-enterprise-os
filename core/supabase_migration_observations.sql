-- 1. Enable pgvector extension if not already present
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the observations table for the "Observation Lounge"
CREATE TABLE IF NOT EXISTS public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  crew_member TEXT NOT NULL,
  title TEXT,
  summary TEXT NOT NULL,
  key_findings TEXT[],
  recommendations TEXT[],
  score INT,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

-- 4. Create a policy for reading observations
CREATE POLICY "Allow authenticated read access to observations" ON public.observations
  FOR SELECT USING (true);

-- 5. Create the vector match function for RPC calls
-- This allows the orchestrator to perform semantic search specifically on critiques
CREATE OR REPLACE FUNCTION match_observations (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  crew_member TEXT,
  summary TEXT,
  key_findings TEXT[],
  recommendations TEXT[],
  score INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    observations.id,
    observations.crew_member,
    observations.summary,
    observations.key_findings,
    observations.recommendations,
    observations.score,
    1 - (observations.embedding <=> query_embedding) AS similarity
  FROM observations
  WHERE 1 - (observations.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 6. Create an index for vector similarity search (using Cosine distance)
CREATE INDEX IF NOT EXISTS observations_embedding_idx ON public.observations 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);