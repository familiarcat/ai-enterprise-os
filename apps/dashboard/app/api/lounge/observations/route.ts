/**
 * GET /api/lounge/observations
 *
 * Reads crew observation JSON files from crew-memories/active/
 * (relative to the repo root — two levels up from apps/dashboard/).
 *
 * File format: { crew_member, role, summary, key_findings[], recommendations[], tags[], timestamp }
 */

import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const CREW_MEMORIES_DIR = path.resolve(process.cwd(), '../../crew-memories/active');

interface CrewObservation {
  crew_member:     string;
  role:            string;
  summary:         string;
  key_findings:    string[];
  recommendations: string[];
  tags:            string[];
  timestamp:       string;
}

export async function GET() {
  try {
    let files: string[];
    try {
      files = await readdir(CREW_MEMORIES_DIR);
    } catch {
      // Directory might not exist yet
      return NextResponse.json({ observations: [], source: 'crew-memories/active' });
    }

    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

    const observations: CrewObservation[] = [];
    for (const file of jsonFiles.slice(0, 20)) {
      try {
        const raw = await readFile(path.join(CREW_MEMORIES_DIR, file), 'utf-8');
        const obs = JSON.parse(raw);
        observations.push({
          crew_member:     obs.crew_member  ?? obs.crew ?? 'Unknown',
          role:            obs.role         ?? '',
          summary:         obs.summary      ?? obs.title ?? '',
          key_findings:    obs.key_findings ?? obs.conclusions ?? [],
          recommendations: obs.recommendations ?? [],
          tags:            obs.tags         ?? [],
          timestamp:       obs.timestamp    ?? new Date().toISOString(),
        });
      } catch {
        // Skip malformed files
      }
    }

    return NextResponse.json({ observations, source: 'crew-memories/active' });
  } catch (err) {
    return NextResponse.json(
      { observations: [], error: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lounge/observations
 * Store a new crew observation (proxied from external sources).
 */
export async function POST(req: Request) {
  try {
    const obs: CrewObservation = await req.json();
    if (!obs.crew_member || !obs.summary) {
      return NextResponse.json({ error: 'crew_member and summary required' }, { status: 400 });
    }

    const { mkdir, writeFile } = await import('fs/promises');
    await mkdir(CREW_MEMORIES_DIR, { recursive: true });

    const slug = obs.crew_member.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `observation-${Date.now()}-${slug}.json`;
    const data = { ...obs, timestamp: obs.timestamp ?? new Date().toISOString() };

    await writeFile(path.join(CREW_MEMORIES_DIR, filename), JSON.stringify(data, null, 2));

    return NextResponse.json({ saved: filename });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
