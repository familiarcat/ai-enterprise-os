/**
 * GET /api/mcp/status
 * Proxies to MCP bridge /health and returns combined status.
 */

import { NextResponse } from 'next/server';

const BRIDGE = process.env.MCP_BRIDGE_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ status: 'online', bridge: BRIDGE, ...data });
  } catch (err) {
    return NextResponse.json(
      { status: 'offline', bridge: BRIDGE, error: String(err) },
      { status: 503 }
    );
  }
}
