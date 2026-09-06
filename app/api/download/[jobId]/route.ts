import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { downloadQueue } from '@/lib/download-queue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const jobIdSchema = /^[a-f0-9-]{36}$/;

/**
 * ダウンロード進捗（SSE）と、完了後の完成ファイル配信を行う Route Handler。
 * - `GET /api/download/:id`          … SSE ストリーム（進捗・完了通知）
 * - `GET /api/download/:id/file`     … 完成ファイルをダウンロード配信
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!jobIdSchema.test(jobId)) {
    return NextResponse.json({ error: 'invalid job id' }, { status: 400 });
  }

  const isFile = req.nextUrl.pathname.endsWith('/file');

  if (isFile) {
    return serveFile(jobId);
  }

  return serveSSE(req, jobId);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!jobIdSchema.test(jobId)) {
    return NextResponse.json({ error: 'invalid job id' }, { status: 400 });
  }
  const job = downloadQueue.get(jobId);
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (['done', 'error', 'cancelled'].includes(job.status)) {
    downloadQueue.remove(jobId);
  } else {
    downloadQueue.cancel(jobId);
  }
  return NextResponse.json({ ok: true });
}

async function serveSSE(req: NextRequest, jobId: string): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* client gone */
        }
      };

      const job = downloadQueue.get(jobId);
      if (!job) {
        send({ error: 'not found', status: 404 });
        controller.close();
        return;
      }

      const unsubscribe = downloadQueue.subscribe(jobId, (j) => send(j));
      send(job);

      const timer = setInterval(() => {
        const current = downloadQueue.get(jobId);
        if (!current) {
          clearInterval(timer);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* noop */
          }
          return;
        }
        // 完了/停止状態になったら閉じる
        if (['done', 'error', 'cancelled'].includes(current.status)) {
          send(current);
          clearInterval(timer);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* noop */
          }
        } else {
          send(current);
        }
      }, 1000);

      req.signal.addEventListener('abort', () => {
        clearInterval(timer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function serveFile(jobId: string): Promise<Response> {
  const job = downloadQueue.get(jobId);
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (job.status !== 'done') {
    return NextResponse.json({ error: 'not ready yet' }, { status: 409 });
  }

  // 出力パスは内部に保持している
  const outputPath = downloadQueue.getOutputPath(jobId);
  if (!outputPath) return NextResponse.json({ error: 'file not found' }, { status: 404 });

  try {
    const data = await readFile(outputPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(job.fileName ?? 'video')}"`,
        'Content-Length': String(data.byteLength),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'file not found' }, { status: 404 });
  }
}
