/**
 * GET /api/mcp/crew/roster
 *
 * Returns the crew roster from:
 *  1. MCP bridge /crew/personas (primary)
 *  2. Fallback: static CREW from crew-manifest (always available)
 */

import { NextResponse } from 'next/server';
import { CREW, MODEL_ID_MAP } from '@/lib/crew-manifest';

const BRIDGE = process.env.MCP_BRIDGE_URL || 'http://localhost:3002';

export async function GET() {
  // Try bridge first
  try {
    const res = await fetch(`${BRIDGE}/crew/personas`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const personas = await res.json();
      // Merge bridge personas with our typed manifest
      const enriched = Object.entries(CREW).map(([handle, agent]) => ({
        handle,
        displayName:   agent.displayName,
        character:     agent.character,
        role:          agent.role,
        dddRole:       agent.dddRole,
        emoji:         agent.emoji,
        preferredTier: agent.preferredTier,
        model:         MODEL_ID_MAP[agent.preferredTier],
        capabilities:  agent.capabilities,
        bridgePersona: personas[handle] ?? null,
      }));
      return NextResponse.json({ crewMembers: enriched, source: 'bridge+manifest' });
    }
  } catch {
    // fall through to static
  }

  // Fallback: static manifest
  const crewMembers = Object.entries(CREW).map(([handle, agent]) => ({
    handle,
    displayName:   agent.displayName,
    character:     agent.character,
    role:          agent.role,
    dddRole:       agent.dddRole,
    emoji:         agent.emoji,
    preferredTier: agent.preferredTier,
    model:         MODEL_ID_MAP[agent.preferredTier],
    capabilities:  agent.capabilities,
    bridgePersona: null,
  }));

  return NextResponse.json({ crewMembers, source: 'manifest-only' });
}
