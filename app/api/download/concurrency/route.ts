import { type NextRequest, NextResponse } from 'next/server';
import { downloadQueue } from '@/lib/download-queue';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({ concurrency: z.number().int().min(1).max(6) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  downloadQueue.setConcurrency(parsed.data.concurrency);
  return NextResponse.json({ concurrency: downloadQueue.getConcurrency() });
}
