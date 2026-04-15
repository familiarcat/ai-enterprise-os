/**
 * POST /api/mcp/execute
 *
 * Opens an SSE session to the MCP bridge, then sends a JSON-RPC
 * tools/call request, waits for the response, and returns it.
 *
 * Body:
 *   { tool: string; args: Record<string, unknown> }
 */

import { NextResponse } from 'next/server';

const BRIDGE = process.env.MCP_BRIDGE_URL || 'http://localhost:3002';

interface ExecuteBody {
  tool: string;
  args: Record<string, unknown>;
}

export async function POST(req: Request) {
  let body: ExecuteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tool, args } = body;
  if (!tool) return NextResponse.json({ error: 'Missing tool' }, { status: 400 });

  // Step 1: Open SSE session and capture sessionId
  let sessionId: string | null = null;

  try {
    const sseRes = await fetch(`${BRIDGE}/sse`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!sseRes.ok || !sseRes.body) {
      throw new Error(`SSE connect failed: ${sseRes.status}`);
    }

    // Read first event to get the sessionId
    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let timedOut = false;

    const timeout = setTimeout(() => { timedOut = true; reader.cancel(); }, 5000);

    while (!sessionId && !timedOut) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE: look for "data: /messages?sessionId=<id>"
      for (const line of buffer.split('\n')) {
        const match = line.match(/data:\s*.*sessionId=([^\s&"]+)/);
        if (match) { sessionId = match[1]; break; }
        // Also handle direct JSON data from bridge
        const jsonMatch = line.match(/^data:\s*(\{.+\})$/);
        if (jsonMatch) {
          try {
            const d = JSON.parse(jsonMatch[1]);
            if (d.sessionId) { sessionId = d.sessionId; break; }
          } catch { /* ignore */ }
        }
      }
    }
    clearTimeout(timeout);
    reader.cancel();
  } catch (err) {
    // If SSE fails, try a simpler direct call pattern the bridge might support
    return NextResponse.json(
      { error: `Failed to open SSE session: ${String(err)}` },
      { status: 502 }
    );
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Could not extract sessionId from SSE stream' },
      { status: 502 }
    );
  }

  // Step 2: Send JSON-RPC tools/call
  try {
    const payload = {
      jsonrpc: '2.0',
      id:      Date.now(),
      method:  'tools/call',
      params:  { name: tool, arguments: args },
    };

    const res = await fetch(`${BRIDGE}/messages?sessionId=${sessionId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(60_000), // 60s for long-running tasks
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Tool call failed: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
