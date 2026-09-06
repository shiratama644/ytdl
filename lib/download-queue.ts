/**
 * ダウンロードジョブキュー（p-queue ベース、シングルトン）。
 *
 * 設計方針:
 * - 単一サーバー・同一プロセスで動作する軽量構成。
 * - 同時実行数（concurrency）は可変。既定 3。
 * - 各ジョブは `queued → downloading-video / downloading-audio → muxing → done|error` の状態機械。
 * - 完了ファイルは TTL 付き一時ファイルとして保存し、`/api/download/:id/file` から配信。
 * - 進捗は `subscribe(id)` で購読でき、SSE でクライアントへプッシュする。
 *
 * 本格運用（マルチインスタンス）では BullMQ + Redis に置き換えることを推奨する。
 */
import PQueue from 'p-queue';
import { getInnertube } from './innertube';
import { muxAVWithFfmpeg, fetchToFile, uniqueTempPath, ensureTmpDir, scheduleTempCleanup } from './ffmpeg';
import type { DownloadJob } from './types';

type Listener = (job: DownloadJob) => void;

interface PendingJob {
  videoUrl?: string;
  audioUrl?: string;
  videoPath?: string;
  audioPath?: string;
  outputPath?: string;
}

class DownloadQueue {
  private queue: PQueue;
  private jobs = new Map<string, DownloadJob>();
  private pending = new Map<string, PendingJob>();
  private listeners = new Map<string, Set<Listener>>();
  private globalListeners = new Set<Listener>();

  constructor(concurrency = 3) {
    this.queue = new PQueue({ concurrency, autoStart: true });
  }

  /** 同時実行数を変更する（稼働中の分は影響しない）。 */
  setConcurrency(n: number): void {
    const concurrency = Math.max(1, Math.min(6, Math.round(n)));
    this.queue.concurrency = concurrency;
  }

  getConcurrency(): number {
    return this.queue.concurrency;
  }

  list(): DownloadJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  get(id: string): DownloadJob | undefined {
    return this.jobs.get(id);
  }

  /** 完成後の出力ファイルパス（内部のみ）。未完成なら undefined。 */
  getOutputPath(id: string): string | undefined {
    return this.pending.get(id)?.outputPath;
  }

  /** GUI 表示用に進行中ジョブのスナップショットを返す。 */
  snapshot(): DownloadJob[] {
    return this.list();
  }

  /**
   * ジョブ登録。resolvedURLs はクライアントに返さないため内部に保持する。
   */
  async create(input: {
    videoId: string;
    title: string;
    videoItag?: number;
    audioItag?: number;
    container: string;
    videoOnly: boolean;
    audioOnly: boolean;
  }): Promise<DownloadJob> {
    const yt = await getInnertube();
    const info = await yt.getInfo(input.videoId);

    const formats = [
      ...(info.streaming_data?.formats ?? []),
      ...(info.streaming_data?.adaptive_formats ?? []),
    ];
    const findFormat = (itag?: number) => formats.find((f) => f.itag === itag);
    const videoFormat = findFormat(input.videoItag);
    const audioFormat = findFormat(input.audioItag);

    if (input.audioOnly) {
      if (!audioFormat) throw new Error('選択した音声フォーマットが見つかりません');
    } else if (input.videoOnly) {
      if (!videoFormat) throw new Error('選択した映像フォーマットが見つかりません');
    } else {
      if (!videoFormat || !audioFormat) {
        throw new Error('映像・音声の両フォーマットが見つかりません');
      }
    }

    const id = crypto.randomUUID();
    const job: DownloadJob = {
      id,
      videoId: input.videoId,
      title: input.title,
      videoItag: input.videoItag,
      audioItag: input.audioItag,
      container: input.container,
      videoOnly: input.videoOnly,
      audioOnly: input.audioOnly,
      status: 'queued',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: undefined,
      createdAt: Date.now(),
    };
    this.jobs.set(id, job);

    // 内部情報を保存してからキューに投入
    this.pending.set(id, {
      videoUrl: videoFormat?.url,
      audioUrl: audioFormat?.url,
    });

    void this.queue.add(() => this.process(id));

    this.emit(job);
    return job;
  }

  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.status === 'done' || job.status === 'error' || job.status === 'cancelled') return;
    job.status = 'cancelled';
    job.finishedAt = Date.now();
    this.emit(job);
  }

  remove(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    // 完了済みのみ削除可能
    if (job.status !== 'done' && job.status !== 'error' && job.status !== 'cancelled') return;
    this.cleanupFiles(id);
    this.jobs.delete(id);
    this.listeners.delete(id);
    this.globalEmit();
  }

  /** クライアントからジョブ進捗を購読する。 */
  subscribe(id: string, cb: Listener): () => void {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    const set = this.listeners.get(id)!;
    set.add(cb);
    return () => set.delete(cb);
  }

  subscribeAll(cb: Listener): () => void {
    this.globalListeners.add(cb);
    return () => this.globalListeners.delete(cb);
  }

  private emit(job: DownloadJob): void {
    this.listeners.get(job.id)?.forEach((cb) => cb(structuredClone(job)));
    this.globalListeners.forEach((cb) => cb(structuredClone(job)));
  }

  private globalEmit(): void {
    for (const job of this.jobs.values()) this.emit(job);
  }

  private async process(id: string): Promise<void> {
    const job = this.jobs.get(id);
    const pending = this.pending.get(id);
    if (!job || !pending) return;
    if (job.status === 'cancelled') return;

    ensureTmpDir();
    job.startedAt = Date.now();

    try {
      const outputExt = job.container;
      const outputPath = uniqueTempPath(outputExt);

      if (job.audioOnly) {
        job.status = 'downloading-audio';
        job.progress = 0;
        this.emit(job);
        const audioPath = uniqueTempPath('audio');
        pending.audioPath = audioPath;
        await this.downloadStream(pending.audioUrl!, audioPath, job, 'audio');
        job.status = 'muxing';
        this.emit(job);
        await muxAVWithFfmpeg({ audioPath, outputPath, container: job.container, audioOnly: true });
      } else if (job.videoOnly) {
        job.status = 'downloading-video';
        job.progress = 0;
        this.emit(job);
        const videoPath = uniqueTempPath('video');
        pending.videoPath = videoPath;
        await this.downloadStream(pending.videoUrl!, videoPath, job, 'video');
        job.status = 'muxing';
        this.emit(job);
        await muxAVWithFfmpeg({ videoPath, outputPath, container: job.container, videoOnly: true });
      } else {
        job.status = 'downloading-video';
        job.progress = 0;
        this.emit(job);
        const videoPath = uniqueTempPath('video');
        const audioPath = uniqueTempPath('audio');
        pending.videoPath = videoPath;
        pending.audioPath = audioPath;
        await this.downloadStream(pending.videoUrl!, videoPath, job, 'video');
        job.status = 'downloading-audio';
        job.progress = 0.01;
        this.emit(job);
        await this.downloadStream(pending.audioUrl!, audioPath, job, 'audio');
        job.status = 'muxing';
        this.emit(job);
        await muxAVWithFfmpeg({ videoPath, audioPath, outputPath, container: job.container });
      }

      // 完了
      const { stat } = await import('node:fs/promises');
      const fileSize = (await stat(outputPath)).size;
      job.status = 'done';
      job.progress = 1;
      job.fileUrl = `/api/download/${job.id}/file`;
      job.fileName = `${this.safeName(job.title)}.${outputExt}`;
      job.fileSize = fileSize;
      job.finishedAt = Date.now();
      pending.outputPath = outputPath;
      scheduleTempCleanup(outputPath);
      this.emit(job);
    } catch (e) {
      job.status = 'error';
      job.error = e instanceof Error ? e.message : String(e);
      job.finishedAt = Date.now();
      this.emit(job);
    } finally {
      this.cleanupFiles(id, true);
    }
  }

  private async downloadStream(
    url: string,
    path: string,
    job: DownloadJob,
    which: 'video' | 'audio',
  ): Promise<void> {
    const total = await fetchToFile(url, path, (bytes, totalBytes) => {
      job.downloadedBytes = bytes;
      if (totalBytes) job.totalBytes = totalBytes;
      const phase = job.audioOnly ? 0.5 : which === 'video' ? 0.55 : 0.8;
      job.progress = Math.min(
        0.95,
        phase * (totalBytes ? bytes / totalBytes : 0.5),
      );
      this.emit(job);
    });
    if (!total) return;
  }

  private async cleanupFiles(id: string, keepOutput = false): Promise<void> {
    const pending = this.pending.get(id);
    if (!pending) return;
    const { unlink } = await import('node:fs/promises');
    for (const p of [pending.videoPath, pending.audioPath]) {
      if (p && !keepOutput) {
        try {
          if (pending.outputPath !== p) await unlink(p);
        } catch {
          /* ignore */
        }
      }
    }
  }

  private safeName(title: string): string {
    return (
      title
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'video'
    );
  }
}

// シングルトン
export const downloadQueue = new DownloadQueue(3);
