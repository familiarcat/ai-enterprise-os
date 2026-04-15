/**
 * POST /api/mcp/execute
 *
 * Opens an SSE session to the MCP bridge, keeps it alive, dispatches a
 * JSON-RPC tools/call via POST /messages, then reads the result back from
 * the SSE stream.
 *
 * MCP SSE transport protocol:
 *   1. GET /sse        → bridge opens SSE stream, sends first event:
 *                        data: /messages?sessionId=<uuid>
 *   2. POST /messages  → client sends JSON-RPC; bridge returns 202 Accepted
 *   3. GET /sse (cont) → bridge writes tool result as a data event:
 *                        data: {"jsonrpc":"2.0","id":<n>,"result":{...}}
 *
 * The SSE connection MUST stay open for the full duration of (2)+(3).
 * Closing it before step 3 drops the session from the bridge's transport
 * map, which causes "Session not found" on the POST and
 * "stream is not readable" if the AbortSignal fires mid-read.
 *
 * Body: { tool: string; args: Record<string, unknown> }
 */

import { NextResponse } from 'next/server';

const BRIDGE              = process.env.MCP_BRIDGE_URL || 'http://localhost:3002';
const SESSION_TIMEOUT_MS  = 8_000;   // max wait for the first SSE event (sessionId)
const TOOL_TIMEOUT_MS     = 90_000;  // max wait for the tool result

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

  const rpcId = Date.now();

  // Single AbortController owns the SSE connection lifetime.
  // We call .abort() exactly once: either on timeout or after we have the result.
  const sseController = new AbortController();
  const closeSSE = () => { try { sseController.abort(); } catch { /* already aborted */ } };

  // ── Step 1: Open SSE connection ─────────────────────────────────────────────
  // No AbortSignal.timeout() here — we close it manually via sseController.
  let sseRes: Response;
  try {
    sseRes = await fetch(`${BRIDGE}/sse`, { signal: sseController.signal });
  } catch (err) {
    return NextResponse.json(
      { error: `Cannot reach MCP bridge at ${BRIDGE}: ${String(err)}` },
      { status: 502 }
    );
  }

  if (!sseRes.ok || !sseRes.body) {
    closeSSE();
    return NextResponse.json(
      { error: `SSE connect failed: HTTP ${sseRes.status}` },
      { status: 502 }
    );
  }

  // ── Step 2: Extract sessionId from the first SSE event ──────────────────────
  // Guard the whole session-extraction phase with a plain setTimeout that
  // aborts the SSE controller. This avoids Promise.race on reader.read()
  // which would leave a dangling pending read and corrupt the reader state.
  let sessionId: string | null = null;
  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();

  const sessionTimer = setTimeout(() => {
    closeSSE();
  }, SESSION_TIMEOUT_MS);

  let buffer = '';
  try {
    outer: while (!sessionId) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        // AbortController fired (session timeout) or connection dropped
        break;
      }
      if (chunk.done) break;

      buffer += decoder.decode(chunk.value, { stream: true });

      for (const line of buffer.split('\n')) {
        // Standard MCP endpoint event: data: /messages?sessionId=<uuid>
        const urlMatch = line.match(/data:\s*[^\s]*[?&]sessionId=([^\s&"]+)/);
        if (urlMatch) { sessionId = urlMatch[1]; break outer; }

        // Fallback: some bridge versions send data: {"sessionId":"..."}
        const jsonMatch = line.match(/^data:\s*(\{.+\})$/);
        if (jsonMatch) {
          try {
            const d = JSON.parse(jsonMatch[1]);
            if (d.sessionId) { sessionId = d.sessionId; break outer; }
          } catch { /* not valid JSON */ }
        }
      }
    }
  } finally {
    clearTimeout(sessionTimer);
  }

  if (!sessionId) {
    closeSSE();
    return NextResponse.json(
      { error: 'Could not extract sessionId from MCP bridge SSE stream' },
      { status: 502 }
    );
  }

  // ── Step 3: POST the JSON-RPC request ──────────────────────────────────────
  // SSE connection is still open. The POST returns 202 Accepted immediately;
  // the actual tool result arrives later as a data event on the SSE stream.
  const payload = {
    jsonrpc: '2.0',
    id:      rpcId,
    method:  'tools/call',
    params:  { name: tool, arguments: args },
  };

  try {
    const postRes = await fetch(`${BRIDGE}/messages?sessionId=${sessionId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(10_000),
    });

    if (!postRes.ok) {
      const text = await postRes.text();
      closeSSE();
      return NextResponse.json(
        { error: `Tool dispatch failed: ${text}` },
        { status: postRes.status }
      );
    }
  } catch (err) {
    closeSSE();
    return NextResponse.json({ error: `Tool dispatch error: ${String(err)}` }, { status: 502 });
  }

  // ── Step 4: Read SSE stream for the JSON-RPC result ─────────────────────────
  // Set a new timeout for tool execution; abort SSE if it fires.
  const toolTimer = setTimeout(() => { closeSSE(); }, TOOL_TIMEOUT_MS);

  buffer = ''; // fresh buffer for result phase
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        // AbortController fired (tool timeout) or connection lost
        return NextResponse.json(
          { error: `Tool '${tool}' timed out after ${TOOL_TIMEOUT_MS / 1000}s` },
          { status: 504 }
        );
      }

      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      // Process complete lines; retain trailing incomplete line in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;
        // Skip the endpoint URL hint that may be re-sent
        if (dataStr.includes('sessionId=') && !dataStr.startsWith('{')) continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(dataStr);
        } catch {
          continue;
        }

        // Accept if id matches, or if it carries a result/error payload
        // (some bridge versions omit echoing the id)
        if (parsed.id !== rpcId && !('result' in parsed) && !('error' in parsed)) continue;

        clearTimeout(toolTimer);
        closeSSE();

        if (parsed.error) {
          const rpcErr = parsed.error as { message?: string };
          return NextResponse.json(
            { error: rpcErr.message ?? JSON.stringify(parsed.error), status: 'ERROR' },
            { status: 500 }
          );
        }

        return NextResponse.json({ result: parsed.result ?? parsed, status: 'SUCCESS' });
      }
    }
  } finally {
    clearTimeout(toolTimer);
    closeSSE();
  }

  return NextResponse.json(
    { error: 'SSE stream closed before tool result arrived' },
    { status: 502 }
  );
}
