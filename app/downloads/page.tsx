'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icons';
import { useDownloadStore } from '@/lib/stores/download';
import { formatBytes, formatEta, formatSpeed } from '@/lib/format';
import type { DownloadJob } from '@/lib/types';

const statusLabel: Record<DownloadJob['status'], string> = {
  queued: '待機中',
  'downloading-video': '映像を取得中',
  'downloading-audio': '音声を取得中',
  muxing: '多重化中',
  done: '完了',
  error: 'エラー',
  cancelled: 'キャンセル',
};

const statusIcon: Record<DownloadJob['status'], IconName> = {
  queued: 'queue',
  'downloading-video': 'download',
  'downloading-audio': 'download',
  muxing: 'play',
  done: 'check',
  error: 'close',
  cancelled: 'remove',
};

export default function DownloadsPage() {
  const [syncing, setSyncing] = useState(false);
  const jobs = useDownloadStore((s) => s.jobs);
  const setConcurrencyStore = useDownloadStore((s) => s.setConcurrency);

  useEffect(() => {
    let aborted = false;
    const sync = async () => {
      try {
        setSyncing(true);
        const res = await fetch('/api/download');
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        if (data.jobs) (data.jobs as DownloadJob[]).forEach((j) => void useDownloadStore.getState().updateJob(j));
        if (data.concurrency) setConcurrencyStore(data.concurrency);
      } catch {
        /* ignore */
      } finally {
        if (!aborted) setSyncing(false);
      }
    };
    sync();
    const timer = setInterval(sync, 2500);
    return () => {
      aborted = true;
      clearInterval(timer);
    };
  }, [setConcurrencyStore]);

  const list = Object.values(jobs).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small">ダウンロード</h1>
        <span className="text-body-small text-on-surface-variant">{syncing ? '同期中…' : `${list.length} 件`}</span>
      </div>

      {list.length === 0 && (
        <div className="grid place-items-center py-28 text-center">
          <div className="grid place-items-center h-20 w-20 rounded-m3-xxl bg-surface-container-high text-on-surface-variant mb-4">
            <Icon name="download" size={40} />
          </div>
          <h2 className="text-title-large">ダウンロードはありません</h2>
          <p className="mt-2 text-body-medium text-on-surface-variant">
            動画ページからダウンロードボタンを押すと、ここにキューが表示されます。
          </p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-m3-full bg-primary text-on-primary text-label-large">
            <Icon name="play" size={20} />
            動画を見る
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {list.map((job) => <JobCard key={job.id} job={job} />)}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: DownloadJob }) {
  const progress = Math.round((job.progress ?? 0) * 100);
  const isActive = ['queued', 'downloading-video', 'downloading-audio', 'muxing'].includes(job.status);

  const cancel = async () => {
    await fetch(`/api/download/${job.id}`, { method: 'DELETE' });
  };
  const remove = async () => {
    await fetch(`/api/download/${job.id}`, { method: 'DELETE' });
    useDownloadStore.getState().removeJob(job.id);
  };

  return (
    <div className="rounded-m3-xl bg-surface-container-low p-5 flex flex-col md:flex-row gap-4">
      <div className="grid place-items-center h-14 w-14 shrink-0 rounded-m3-lg bg-primary/10 text-primary">
        <Icon name={statusIcon[job.status]} size={26} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-title-medium text-on-surface">{job.title}</p>
          {job.status === 'done' && (
            <a
              href={job.fileUrl}
              download={job.fileName}
              className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-m3-full bg-tertiary text-on-tertiary hover:brightness-95 text-label-large"
            >
              <Icon name="download" size={18} />
              保存
            </a>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-label-medium text-on-surface-variant">
          <span>{statusLabel[job.status]}</span>
          <span>{job.container.toUpperCase()}</span>
          {job.fileSize && <span>{formatBytes(job.fileSize)}</span>}
          {job.etaSeconds ? <span>残り {formatEta(job.etaSeconds)}</span> : null}
          {job.speedBytesPerSec ? <span>{formatSpeed(job.speedBytesPerSec)}</span> : null}
        </div>
        {isActive && job.status !== 'queued' && (
          <div className="mt-3 h-2 rounded-m3-full bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
        {job.error && <p className="mt-2 text-body-small text-error">{job.error}</p>}
      </div>
      <div className="flex md:flex-col gap-2 shrink-0 items-start">
        {isActive && (
          <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant">
            <Icon name="stop" size={16} />
            キャンセル
          </button>
        )}
        {(job.status === 'done' || job.status === 'error' || job.status === 'cancelled') && (
          <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-m3-full hover:bg-surface-container-high text-on-surface-variant">
            <Icon name="remove" size={16} />
            削除
          </button>
        )}
      </div>
    </div>
  );
}
