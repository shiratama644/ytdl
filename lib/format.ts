/** 表示用フォーマッタ（サーバー＆クライアント両方で使用）。 */

export function formatViews(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}億`;
  if (n >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}億`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1).replace(/\.0$/, '')}万`;
  return `${n}`;
}

export function formatDuration(text: string): string {
  // 既に "3:45" のような場合はそのまま
  if (/^\d+:\d+/.test(text)) return text;
  const parts = text.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return text;
  if (parts.length === 3) return `${parts[0]}:${String(parts[1]).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`;
  if (parts.length === 2) return `${parts[0]}:${String(parts[1]).padStart(2, '0')}`;
  return text;
}

export function formatDurationSeconds(sec?: number): string {
  if (sec === undefined || Number.isNaN(sec)) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatBytes(n?: number): string {
  if (n === undefined) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

export function formatEta(sec?: number): string {
  if (sec === undefined || Number.isNaN(sec)) return '';
  if (sec < 60) return `${Math.round(sec)}秒`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}分${s}秒`;
}

export function formatSpeed(bytesPerSec?: number): string {
  if (bytesPerSec === undefined) return '';
  return `${formatBytes(bytesPerSec)}/s`;
}
