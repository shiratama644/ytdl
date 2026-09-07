import { create } from 'zustand';
import type { DownloadJob } from '@/lib/types';

/**
 * ダウンロードキュー（クライアント側ミラー）。
 * サーバーの `downloadQueue` と SSE 経由で同期する。
 */
interface DownloadState {
  jobs: Record<string, DownloadJob>;
  concurrency: number;
  /** SSE 接続を張るための videoId ベースのアクティブ・セット */
  activeVideoId?: string;
  addJob: (job: DownloadJob) => void;
  updateJob: (job: DownloadJob) => void;
  removeJob: (id: string) => void;
  setConcurrency: (n: number) => void;
  setActiveVideo: (videoId: string | undefined) => void;
  get: (id: string) => DownloadJob | undefined;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  jobs: {},
  concurrency: 3,
  addJob: (job) =>
    set((s) => ({ jobs: { ...s.jobs, [job.id]: job } })),
  updateJob: (job) =>
    set((s) => ({ jobs: { ...s.jobs, [job.id]: { ...s.jobs[job.id], ...job } } })),
  removeJob: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.jobs;
      return { jobs: rest };
    }),
  setConcurrency: (n) => set({ concurrency: Math.max(1, Math.min(6, Math.round(n))) }),
  setActiveVideo: (videoId) => set({ activeVideoId: videoId }),
  get: (id) => get().jobs[id],
}));
