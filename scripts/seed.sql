-- Seed data for the missions table
-- These examples represent a base project to test retrieval and interaction.

INSERT INTO public.missions (content, metadata, embedding)
VALUES 
(
  'Initialize the Sovereign Factory infrastructure: Setup workspace, install pnpm, and verify Docker daemon connectivity.',
  '{"category": "infrastructure", "priority": "high", "tags": ["setup", "backbone"]}',
  -- Generates a dummy 1536-dimensional vector for testing retrieval
  (SELECT array_agg(0.01)::vector FROM generate_series(1, 1536))
),
(
  'Implement the Dashboard domain: Scaffold UI, Application, and Infrastructure layers using the DDD pattern.',
  '{"category": "development", "priority": "medium", "tags": ["domain", "ui"]}',
  -- Generates a dummy 1536-dimensional vector for testing retrieval
  (SELECT array_agg(0.02)::vector FROM generate_series(1, 1536))
),
(
  'Conduct a security audit of the MCP bridge: Verify token validation and cross-repo communication integrity.',
  '{"category": "security", "priority": "high", "tags": ["security", "mcp"]}',
  -- Generates a dummy 1536-dimensional vector for testing retrieval
  (SELECT array_agg(0.03)::vector FROM generate_series(1, 1536))
);