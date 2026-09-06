import { NextRequest, NextResponse } from 'next/server';
import { downloadQueue } from '@/lib/download-queue';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
    title: z.string().max(200).optional().default(''),
    videoItag: z.number().int().positive().optional(),
    audioItag: z.number().int().positive().optional(),
    container: z.enum(['mp4', 'webm', 'mkv', 'mp3', 'm4a', 'ogg']).default('mp4'),
    videoOnly: z.boolean().optional().default(false),
    audioOnly: z.boolean().optional().default(false),
  })
  .refine((d) => !(d.videoOnly && d.audioOnly), {
    message: 'videoOnly と audioOnly は同時に指定できません',
  });

export async function GET() {
  return NextResponse.json({
    concurrency: downloadQueue.getConcurrency(),
    jobs: downloadQueue.snapshot(),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const job = await downloadQueue.create({
      videoId: input.videoId,
      title: input.title || input.videoId,
      videoItag: input.videoItag,
      audioItag: input.audioItag,
      container: input.container,
      videoOnly: input.videoOnly,
      audioOnly: input.audioOnly,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
