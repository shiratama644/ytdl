'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/icons';
import { useDownloadStore } from '@/lib/stores/download';
import { formatBytes } from '@/lib/format';
import type { FormatData } from '@/lib/types';

interface DownloadDialogProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
  videoFormats: FormatData[];
  audioFormats: FormatData[];
}

type Mode = 'both' | 'video' | 'audio';

export function DownloadDialog({
  open,
  onClose,
  videoId,
  title,
  videoFormats,
  audioFormats,
}: DownloadDialogProps) {
  const [mode, setMode] = useState<Mode>('both');
  const [videoItag, setVideoItag] = useState<number | undefined>(undefined);
  const [audioItag, setAudioItag] = useState<number | undefined>(undefined);
  const [container, setContainer] = useState('mp4');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addJob = useDownloadStore((s) => s.addJob);

  const sortedVideos = useMemo(
    () =>
      [...videoFormats].sort(
        (a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.bitrate ?? 0) - (a.bitrate ?? 0),
      ),
    [videoFormats],
  );
  const sortedAudio = useMemo(
    () => [...audioFormats].sort((a, b) => b.bitrate - a.bitrate),
    [audioFormats],
  );

  const videoOptions = sortedVideos.filter((f) => f.hasVideo);
  const audioOptions = sortedAudio.filter((f) => f.hasAudio);
  const isAudioOnly = mode === 'audio';

  const containers: { id: string; label: string; icon: IconName }[] = [
    { id: 'mp4', label: 'MP4', icon: 'play' },
    { id: 'webm', label: 'WebM', icon: 'play' },
    { id: 'mkv', label: 'MKV', icon: 'play' },
    ...(isAudioOnly
      ? ([
          { id: 'mp3', label: 'MP3', icon: 'play' },
          { id: 'm4a', label: 'M4A', icon: 'play' },
          { id: 'ogg', label: 'OGG', icon: 'play' },
        ] as { id: string; label: string; icon: IconName }[])
      : []),
  ];

  const selectedVideo =
    videoOptions.find((f) => f.itag === videoItag) ?? videoOptions[0];
  const selectedAudio =
    audioOptions.find((f) => f.itag === audioItag) ?? audioOptions[0];

  if (!open) return null;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const vItag = mode === 'audio' ? undefined : (selectedVideo?.itag ?? videoItag);
      const aItag = mode === 'video' ? undefined : (selectedAudio?.itag ?? audioItag);
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title,
          videoItag: vItag,
          audioItag: aItag,
          container,
          videoOnly: mode === 'video',
          audioOnly: mode === 'audio',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : '登録に失敗しました');
      addJob(data.job);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-surface-container-high rounded-m3-xl rounded-m3-xl-inc shadow-m3-elevation-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-title-large">ダウンロード</h2>
          <button type="button" onClick={onClose} className="grid place-items-center h-10 w-10 rounded-m3-full hover:bg-surface-container-highest">
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className="mt-1 line-clamp-2 text-body-small text-on-surface-variant">{title}</p>

        {/* モード切替 */}
        <div className="mt-5 flex gap-2">
          {(
            [
              { id: 'both', label: '映像+音声' },
              { id: 'video', label: '映像のみ' },
              { id: 'audio', label: '音声のみ' },
            ] as const
          ).map((m) => (
            <button type="button"
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 h-10 rounded-m3-md text-label-large ${
                mode === m.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 映像品質 */}
        {!isAudioOnly && (
          <div className="mt-5">
            <span className="block text-label-medium text-on-surface-variant">映像品質</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {videoOptions.map((f) => {
                const sel = (selectedVideo?.itag ?? videoItag) === f.itag;
                return (
                  <button type="button"
                    key={f.itag}
                    onClick={() => setVideoItag(f.itag)}
                    className={`px-3 py-2 rounded-m3-md text-body-small text-left ${
                      sel
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <span className="block text-title-small">
                      {f.height ? `${f.height}p` : 'Auto'} {f.qualityLabel ? `(${f.qualityLabel})` : ''}
                      {f.fps ? ` ${f.fps}fps` : ''}
                    </span>
                    <span className="block truncate text-label-small opacity-80">
                      {f.codec}
                      {f.contentLength ? ` · ${formatBytes(f.contentLength)}` : ''}
                    </span>
                  </button>
                );
              })}
              {videoOptions.length === 0 && (
                <p className="col-span-2 text-body-small text-on-surface-variant">映像フォーマットがありません。</p>
              )}
            </div>
          </div>
        )}

        {/* 音声品質 */}
        {!isVideoOnly(mode) && (
          <div className="mt-5">
            <span className="block text-label-medium text-on-surface-variant">音声品質</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {audioOptions.map((f) => {
                const sel = (selectedAudio?.itag ?? audioItag) === f.itag;
                return (
                  <button type="button"
                    key={f.itag}
                    onClick={() => setAudioItag(f.itag)}
                    className={`px-3 py-2 rounded-m3-md text-body-small text-left ${
                      sel
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    <span className="block text-title-small">
                      {f.codec ?? 'audio'}
                    </span>
                    <span className="block truncate text-label-small opacity-80">
                      {f.bitrate ? `${(f.bitrate / 1000).toFixed(0)}kbps` : ''}
                      {f.contentLength ? ` · ${formatBytes(f.contentLength)}` : ''}
                    </span>
                  </button>
                );
              })}
              {audioOptions.length === 0 && (
                <p className="col-span-2 text-body-small text-on-surface-variant">音声フォーマットがありません。</p>
              )}
            </div>
          </div>
        )}

        {/* コンテナ */}
        <div className="mt-5">
          <span className="block text-label-medium text-on-surface-variant">出力コンテナ</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {containers.map((c) => (
              <button type="button"
                key={c.id}
                onClick={() => setContainer(c.id)}
                className={`h-9 px-4 rounded-m3-full text-label-large ${
                  container === c.id
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-body-small text-error">{error}</p>}

        <div className="mt-6 flex gap-2 justify-end">
          <Button variant="text" onClick={onClose}>キャンセル</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? '登録中…' : 'ダウンロード開始'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function isVideoOnly(mode: Mode): boolean {
  return mode === 'video';
}
