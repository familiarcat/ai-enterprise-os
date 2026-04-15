-- Enable the "vector" extension to work with embeddings
create extension if not exists vector;

-- Create the missions table for vector memory
create table if not exists public.missions (
  id bigint primary key generated always as identity,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536), -- Optimized for OpenAI text-embedding-3-small
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an HNSW index for high-performance vector similarity search
create index on public.missions using hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
alter table public.missions enable row level security;

-- Create the match_missions function for the orchestrator
create or replace function public.match_missions (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id, m.content, m.metadata,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.missions m
  where 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;