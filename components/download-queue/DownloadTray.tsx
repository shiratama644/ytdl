'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDownloadStore } from '@/lib/stores/download';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/icons';
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

export function DownloadTray() {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [supported, setSupported] = useState(false);
  const jobs = useDownloadStore((s) => s.jobs);

  useEffect(() => {
    setSupported(true);
  }, []);

  // サーバーのキューと同期（ポーリング）
  useEffect(() => {
    if (!open) return;
    let aborted = false;
    const sync = async () => {
      try {
        setSyncing(true);
        const res = await fetch('/api/download');
        const data = await res.json();
        if (aborted) return;
        if (data.jobs) {
          (data.jobs as DownloadJob[]).forEach((j) => useDownloadStore.getState().updateJob(j));
        }
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
  }, [open]);

  const list = Object.values(jobs).sort((a, b) => a.createdAt - b.createdAt);
  const active = list.filter((j) =>
    ['queued', 'downloading-video', 'downloading-audio', 'muxing'].includes(j.status),
  ).length;

  return (
    <>
      {supported && (
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 h-14 pl-4 pr-5 rounded-m3-xl bg-primary-container text-on-primary-container shadow-m3-elevation-3 hover:shadow-m3-elevation-4 transition-shadow"
          >
            <span className="relative grid place-items-center h-7 w-7">
              {active > 0 ? (
                <Icon name="download" size={22} />
              ) : (
                <Icon name="play" size={22} fill />
              )}
            </span>
            <span className="text-label-large">ダウンロード</span>
            {active > 0 && (
              <span className="grid place-items-center min-w-[20px] h-[20px] px-1 rounded-m3-full bg-primary text-on-primary text-label-small font-bold">
                {active}
              </span>
            )}
          </button>
        </div>
      )}

      {supported && open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          {/* Scrim */}
          <button
            aria-label="閉じる"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-surface-container-high rounded-t-m3-xl rounded-b-none md:rounded-b-m3-xl md:rounded-m3-xl shadow-m3-elevation-4 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-outline-variant">
              <div className="flex items-center justify-between">
                <h2 className="text-title-large">ダウンロードキュー</h2>
                <button onClick={() => setOpen(false)} className="grid place-items-center h-10 w-10 rounded-m3-full hover:bg-surface-container-highest">
                  <Icon name="close" size={20} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-body-small text-on-surface-variant">同時実行数</span>
                <ConcurrencyControl />
              </div>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {list.length === 0 && (
                <p className="text-body-medium text-on-surface-variant text-center py-16">
                  {syncing ? '同期中…' : 'ダウンロードはありません'}
                </p>
              )}
              {list.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function ConcurrencyControl() {
  const concurrency = useDownloadStore((s) => s.concurrency);
  const setConcurrency = useDownloadStore((s) => s.setConcurrency);
  const apply = async (n: number) => {
    setConcurrency(n);
    await fetch('/api/download/concurrency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurrency: n }),
    });
  };
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <button
          key={n}
          onClick={() => apply(n)}
          className={`grid place-items-center h-8 w-8 rounded-m3-full text-label-medium ${
            concurrency === n ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-highest'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function JobRow({ job }: { job: DownloadJob }) {
  const removeJob = useDownloadStore((s) => s.removeJob);
  const progress = Math.round((job.progress ?? 0) * 100);
  const isActive = ['queued', 'downloading-video', 'downloading-audio', 'muxing'].includes(job.status);

  const cancel = async () => {
    await fetch(`/api/download/${job.id}`, { method: 'DELETE' });
  };
  const remove = async () => {
    await fetch(`/api/download/${job.id}`, { method: 'DELETE' });
    removeJob(job.id);
  };

  return (
    <div className="rounded-m3-lg bg-surface-container-low p-3 flex gap-3">
      <div className="grid place-items-center h-11 w-11 shrink-0 rounded-m3-md bg-primary/10 text-primary">
        <Icon name={statusIcon[job.status]} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-title-small line-clamp-2 text-on-surface">{job.title}</p>
          {job.status === 'done' && (
            <a
              href={job.fileUrl}
              download={job.fileName}
              className="shrink-0 grid place-items-center h-9 w-9 rounded-m3-full bg-tertiary text-on-tertiary hover:brightness-95"
              aria-label="ファイルをダウンロード"
            >
              <Icon name="download" size={18} />
            </a>
          )}
        </div>
        <p className="text-body-small text-on-surface-variant">{statusLabel[job.status]}</p>
        {isActive && job.status !== 'queued' && (
          <div className="mt-2 h-2 rounded-m3-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <div className="mt-1 flex items-center gap-3 text-label-small text-on-surface-variant">
          {job.totalBytes && <span>{formatBytes(job.downloadedBytes)} / {formatBytes(job.totalBytes)}</span>}
          {job.speedBytesPerSec ? <span>{formatSpeed(job.speedBytesPerSec)}</span> : null}
          {job.etaSeconds ? <span>残り {formatEta(job.etaSeconds)}</span> : null}
          {progress > 0 && <span>{progress}%</span>}
        </div>
        {job.error && <p className="mt-1 text-body-small text-error">{job.error}</p>}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {isActive && (
          <button onClick={cancel} className="grid place-items-center h-9 w-9 rounded-m3-full hover:bg-surface-container-highest" aria-label="キャンセル">
            <Icon name="stop" size={18} />
          </button>
        )}
        {(job.status === 'done' || job.status === 'error' || job.status === 'cancelled') && (
          <button onClick={remove} className="grid place-items-center h-9 w-9 rounded-m3-full hover:bg-surface-container-highest" aria-label="削除">
            <Icon name="remove" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
