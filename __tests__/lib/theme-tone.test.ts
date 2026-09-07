import { describe, it, expect } from 'vitest';
import {
  TONE_PRESETS,
  DEFAULT_TONE,
  getTonePreset,
  toneTokens,
} from '@/lib/theme';

describe('theme tone presets (pure)', () => {
  it('DEFAULT_TONE は obsidian-frost', () => {
    expect(DEFAULT_TONE).toBe('obsidian-frost');
  });

  it('TONE_PRESETS は設計仕様書の4トーンを含む', () => {
    const ids = TONE_PRESETS.map((t) => t.id);
    expect(ids).toEqual([
      'obsidian-frost',
      'smoky-quartz',
      'nordic-mist',
      'deep-forest',
    ]);
  });

  it('getTonePreset は無効値に既定トーンを返す', () => {
    expect(getTonePreset('obsidian-frost').id).toBe('obsidian-frost');
    // @ts-expect-error - 不完全なIDを渡しても既定トーンへフォールバックする
    expect(getTonePreset('nope').id).toBe('obsidian-frost');
  });

  it('toneTokens は base/surface/accent を対応するトークンへ展開する', () => {
    const tokens = toneTokens('obsidian-frost', 'dark');
    expect(tokens['md-sys-color-background']).toBe('#0E1116');
    expect(tokens['md-sys-color-surface']).toBe('#161B22');
    expect(tokens['md-sys-color-primary']).toBe('#38BDF8');
    expect(tokens['md-sys-color-on-surface']).toBe('#E6EDF3');
    expect(tokens['md-sys-color-surface-translucent']).toBe('rgba(22, 27, 34, 0.75)');
  });

  it('toneTokens はライトモードで on-primary が白になる', () => {
    const tokens = toneTokens('nordic-mist', 'light');
    expect(tokens['md-sys-color-on-primary']).toBe('#FFFFFF');
    expect(tokens['md-sys-color-background']).toBe('#F8FAFC');
  });
});
