import { describe, it, expect } from 'vitest';
import {
  formatViews,
  formatDuration,
  formatDurationSeconds,
  formatBytes,
  formatEta,
  formatSpeed,
} from '@/lib/format';

describe('formatViews', () => {
  it('未定義・NaN は空文字を返す', () => {
    expect(formatViews(undefined)).toBe('');
    expect(formatViews(Number.NaN)).toBe('');
  });

  it('1 億以上は「億」表記（小数 1 桁、末尾 .0 を除去）', () => {
    expect(formatViews(1_200_000_000)).toBe('1.2億');
    expect(formatViews(1_000_000_000)).toBe('1億');
    expect(formatViews(329_000_000)).toBe('3.3億');
  });

  it('1 万以上 1 億未満は「万」表記', () => {
    expect(formatViews(123_456_789)).toBe('1.2億');
    expect(formatViews(45_600)).toBe('4.6万');
    expect(formatViews(10_000)).toBe('1万');
  });

  it('1 万未満はそのまま整数表記', () => {
    expect(formatViews(1234)).toBe('1234');
    expect(formatViews(0)).toBe('0');
  });
});

describe('formatDuration', () => {
  it('既に "3:45" 形式はそのまま返す', () => {
    expect(formatDuration('3:45')).toBe('3:45');
    expect(formatDuration('1:02:03')).toBe('1:02:03');
  });

  it('コロンを含む形式は正規化せずそのまま返す（ゼロ埋めしない）', () => {
    expect(formatDuration('1:2:3')).toBe('1:2:3');
    expect(formatDuration('0:0:5')).toBe('0:0:5');
  });

  it('既に "分:秒" 形式のものは正規化せずそのまま返す（ゼロ埋めしない）', () => {
    expect(formatDuration('1:5')).toBe('1:5');
    expect(formatDuration('12:34')).toBe('12:34');
  });

  it('数値に変換できない場合は入力文字列をそのまま返す', () => {
    expect(formatDuration('abc')).toBe('abc');
    expect(formatDuration('3:xx')).toBe('3:xx');
    expect(formatDuration('1:2:3:4')).toBe('1:2:3:4');
  });
});

describe('formatDurationSeconds', () => {
  it('未定義・NaN は空文字を返す', () => {
    expect(formatDurationSeconds(undefined)).toBe('');
    expect(formatDurationSeconds(Number.NaN)).toBe('');
  });

  it('1 時間以上は h:mm:ss 形式', () => {
    expect(formatDurationSeconds(3661)).toBe('1:01:01');
    expect(formatDurationSeconds(3600)).toBe('1:00:00');
  });

  it('1 時間未満は m:ss 形式（秒は 2 桁ゼロ埋め）', () => {
    expect(formatDurationSeconds(65)).toBe('1:05');
    expect(formatDurationSeconds(5)).toBe('0:05');
    expect(formatDurationSeconds(0)).toBe('0:00');
  });
});

describe('formatBytes', () => {
  it('未定義は空文字を返す', () => {
    expect(formatBytes(undefined)).toBe('');
  });

  it('1GB 以上は GB 表記', () => {
    expect(formatBytes(1_500_000_000)).toBe('1.5 GB');
  });

  it('1MB 以上は MB 表記', () => {
    expect(formatBytes(2_500_000)).toBe('2.5 MB');
  });

  it('1KB 以上は KB 表記（整数、小数は四捨五入）', () => {
    expect(formatBytes(800)).toBe('800 B');
    expect(formatBytes(1000)).toBe('1 KB');
    expect(formatBytes(1500)).toBe('2 KB');
  });

  it('1KB 未満は B 表記', () => {
    expect(formatBytes(512)).toBe('512 B');
  });
});

describe('formatEta', () => {
  it('未定義・NaN は空文字を返す', () => {
    expect(formatEta(undefined)).toBe('');
    expect(formatEta(Number.NaN)).toBe('');
  });

  it('60 秒未満は「N秒」', () => {
    expect(formatEta(45)).toBe('45秒');
    expect(formatEta(5.6)).toBe('6秒');
  });

  it('60 秒以上は「M分S秒」', () => {
    expect(formatEta(65)).toBe('1分5秒');
    expect(formatEta(125.9)).toBe('2分6秒');
  });
});

describe('formatSpeed', () => {
  it('未定義は空文字を返す', () => {
    expect(formatSpeed(undefined)).toBe('');
  });

  it('フォーマットは formatBytes 結果に /s を付加', () => {
    expect(formatSpeed(1_500_000)).toBe('1.5 MB/s');
    expect(formatSpeed(512)).toBe('512 B/s');
  });
});
