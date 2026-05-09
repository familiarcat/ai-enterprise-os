#!/usr/bin/env bash
# init-supabase.sh | Assigned: Chief O'Brien
# Purpose: Initializes the local Supabase PostgreSQL schema for the Sovereign Factory.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

echo "🖖 O'Brien: Preparing the transporter pads for database initialization..."

# 1. Wait for the database container to be healthy
echo "⏳ Waiting for PostgreSQL (db) to be ready..."
until docker exec ai-enterprise-os-db-1 pg_isready -U postgres > /dev/null 2>&1; do
  sleep 2
done

# 2. Apply Schema DDL
echo "🏗️  Applying schema for core infrastructure..."

docker exec -i ai-enterprise-os-db-1 psql -U postgres <<EOF
-- Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Missions Table (Semantic Memory)
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project & Task Management
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  details JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_usage (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  tokens_used BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_missions (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity float)
LANGUAGE plpgsql AS \$\$
BEGIN
  RETURN QUERY
  SELECT missions.id, missions.content, missions.metadata, 1 - (missions.embedding <=> query_embedding) AS similarity
  FROM missions WHERE 1 - (missions.embedding <=> query_embedding) > match_threshold
  ORDER BY missions.embedding <=> query_embedding LIMIT match_count;
END; \$\$;
EOF

echo "✅ Local Supabase schema initialized successfully."