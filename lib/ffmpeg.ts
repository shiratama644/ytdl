/**
 * FFmpeg ラッパー。
 * バイナリ解決は次の優先順位で行う:
 *  1. `FFMPEG_BIN` 環境変数
 *  2. `ffmpeg-static`（npm パッケージ。インストール時にバイナリを取得）
 *  3. システム `ffmpeg`（`ffmpeg -version` が通る場合）
 * いずれも成功しない場合は明示的にエラーを投げる。
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

let cachedFfmpegPath: string | null = null;

async function ffmpegStaticPath(): Promise<string | null> {
  try {
    const mod = await import('ffmpeg-static');
    const pkgPath = (mod as any).default ?? mod;
    if (typeof pkgPath === 'string' && pkgPath && existsSync(pkgPath)) return pkgPath;
    return null;
  } catch {
    return null;
  }
}

export async function resolveFfmpegPath(): Promise<string> {
  if (cachedFfmpegPath && existsSync(cachedFfmpegPath)) return cachedFfmpegPath;

  // 1. 環境変数
  const envBin = process.env.FFMPEG_BIN;
  if (envBin && existsSync(envBin)) {
    cachedFfmpegPath = envBin;
    return cachedFfmpegPath;
  }

  // 2. ffmpeg-static
  const stat = await ffmpegStaticPath();
  if (stat) {
    cachedFfmpegPath = stat;
    return cachedFfmpegPath;
  }

  // 3. システム ffmpeg
  try {
    const result = await runCommand('ffmpeg', ['-version']);
    if (result.code === 0) {
      cachedFfmpegPath = 'ffmpeg';
      return cachedFfmpegPath;
    }
  } catch {
    // ignore
  }

  throw new Error(
    'ffmpeg バイナリが見つかりません。FFMPEG_BIN 環境変数を設定するか、`ffmpeg-static` を再インストールしてください。',
  );
}

function runCommand(cmd: string, args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args);
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => resolve({ code: null, stderr: e.message }));
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

/* ---------------------------------------------------------------------------
 * 一時ファイル管理
 * ------------------------------------------------------------------------- */

function tmpWorkDir(): string {
  return join(tmpdir(), 'ytdl');
}

/** ユニークな一時ファイルパス（拡張子付き）を返す。 */
export function uniqueTempPath(ext: string): string {
  return join(tmpWorkDir(), `${randomUUID()}.${ext}`);
}

export function ensureTmpDir(): void {
  mkdirSync(tmpWorkDir(), { recursive: true });
}

const TTL_MS = 30 * 60 * 1000; // 30 分

/** 一時ファイルを TTL 後に削除するタイマーを仕掛ける。 */
export function scheduleTempCleanup(filePath: string, ttlMs: number = TTL_MS): void {
  const timer = setTimeout(async () => {
    try {
      const { unlink } = await import('node:fs/promises');
      await unlink(filePath);
    } catch {
      // 削除済み等
    }
  }, ttlMs);
  timer.unref?.();
}

/* ---------------------------------------------------------------------------
 * ダウンロード（URL をローカルファイルへストリーム保存）
 * ------------------------------------------------------------------------- */

export async function fetchToFile(
  url: string,
  filePath: string,
  onProgress?: (bytes: number, total?: number) => void,
): Promise<number> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  });
  if (!res.ok || !res.body) {
    throw new Error(`ストリーム取得に失敗しました (HTTP ${res.status})`);
  }
  const total = Number(res.headers.get('content-length')) || undefined;
  const out = createWriteStream(filePath);
  const reader = res.body.getReader();
  let bytes = 0;

  return new Promise<number>((resolve, reject) => {
    const pump = async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!out.write(value)) {
            await new Promise<void>((r) => out.once('drain', r));
          }
          bytes += value.byteLength;
          onProgress?.(bytes, total);
        }
        out.end();
        await new Promise<void>((resolveEnd, rejectEnd) => {
          out.on('finish', resolveEnd);
          out.on('error', rejectEnd);
        });
        resolve(bytes);
      } catch (e) {
        out.destroy();
        reject(e);
      }
    };
    pump();
  });
}

/* ---------------------------------------------------------------------------
 * 多重化 / 変換
 * ------------------------------------------------------------------------- */

export interface MuxOptions {
  videoPath?: string;
  audioPath?: string;
  outputPath: string;
  container: string;
  audioOnly?: boolean;
  videoOnly?: boolean;
}

/**
 * 映像・音声を ffmpeg で多重化する。
 * - `-c copy`（無劣化）を基本とし、コンテナとコーデックが非互換の場合のみ再エンコード。
 * - 音声のみ（mp3 等）は `-vn` で映像を落とし、指定コーデックで変換する。
 */
export async function muxAVWithFfmpeg(opts: MuxOptions): Promise<void> {
  const ffmpeg = await resolveFfmpegPath();
  const args: string[] = ['-y'];

  const hasVideo = !!opts.videoPath;
  const hasAudio = !!opts.audioPath;

  if (hasVideo) args.push('-i', opts.videoPath!);
  if (hasAudio) args.push('-i', opts.audioPath!);

  if (opts.audioOnly) {
    args.push('-vn');
    if (opts.container === 'mp3') args.push('-codec:a', 'libmp3lame', '-q:a', '2');
    else if (opts.container === 'ogg') args.push('-codec:a', 'libvorbis');
    else args.push('-c', 'copy');
  } else if (opts.videoOnly) {
    args.push('-an');
    args.push('-c', 'copy');
  } else if (hasVideo && hasAudio) {
    args.push('-map', '0:v:0');
    args.push('-map', '1:a:0');
    // 例) VP9 動画 + Opus 音声を mp4 にすると非互換 → 再エンコード
    const needsReencode = opts.container === 'mp4' && opts.audioPath?.endsWith('.opus');
    args.push('-c', needsReencode ? 'libx264' : 'copy');
    args.push('-c:a', needsReencode ? 'aac' : 'copy');
  }

  args.push(opts.outputPath);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpeg, args);
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => reject(new Error(`ffmpeg 起動に失敗: ${e.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 終了コード ${code}: ${stderr.slice(-500)}`));
    });
  });
}
