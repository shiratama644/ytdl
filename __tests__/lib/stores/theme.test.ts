import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ThemeMode, ToneId } from '@/lib/theme';

// lib/theme.ts は material-color-utilities を dynamic import し、
// その内部 import が拡張子なしのため厳格な Node ESM では解決できない。
// ストアの状態遷移のみを検証するため、generateDynamicTheme をスタブする。
vi.mock('@/lib/theme', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/theme')>();
  return {
    ...actual,
    generateDynamicTheme: vi.fn(async (_seed: string, _mode: ThemeMode) => ({})),
  };
});

import { useThemeStore } from '@/lib/stores/theme';

describe('useThemeStore (state transitions)', () => {
  beforeEach(() => {
    // persist の状態をリセット（このテストでは localStorage は使用しない）
    useThemeStore.setState({
      preference: 'system',
      mode: 'dark',
      dynamic: 'off',
      seed: '#a01c2f',
      tone: 'obsidian-frost',
    });
  });

  it('既定値 (system / dark / off / DEFAULT_SEED / DEFAULT_TONE)', () => {
    const s = useThemeStore.getState();
    expect(s.preference).toBe('system');
    expect(s.mode).toBe('dark');
    expect(s.dynamic).toBe('off');
    expect(s.seed).toBe('#a01c2f');
    expect(s.tone).toBe('obsidian-frost');
  });

  it('setSeed / setDynamic / setPreference / setTone を更新する', () => {
    useThemeStore.getState().setSeed('#112233');
    useThemeStore.getState().setDynamic('thumbnail');
    useThemeStore.getState().setPreference('light');
    useThemeStore.getState().setTone('smoky-quartz' as ToneId);
    const s = useThemeStore.getState();
    expect(s.seed).toBe('#112233');
    expect(s.dynamic).toBe('thumbnail');
    expect(s.preference).toBe('light');
    expect(s.tone).toBe('smoky-quartz');
  });

  it('toggleMode は dark ⇔ light を切替え、preference も同期する', () => {
    useThemeStore.getState().toggleMode();
    const s = useThemeStore.getState();
    expect(s.mode).toBe('light');
    expect(s.preference).toBe('light');
  });

  it('apply は preference に応じた data-theme 属性を設定する (generateDynamicTheme がスタブ)', () => {
    useThemeStore.getState().setPreference('dark');
    useThemeStore.getState().apply();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
