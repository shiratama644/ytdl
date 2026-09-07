import { describe, it, expect } from 'vitest';
import { applyThemeTokens, DEFAULT_SEED } from '@/lib/theme';

describe('theme helpers (pure)', () => {
  it('DEFAULT_SEED はブランドシード', () => {
    expect(DEFAULT_SEED).toBe('#a01c2f');
  });

  it('applyThemeTokens は <html> に CSS カスタムプロパティを設定する', () => {
    applyThemeTokens({ 'md-sys-color-primary': '#000000' });
    expect(document.documentElement.style.getPropertyValue('--md-sys-color-primary')).toBe(
      '#000000',
    );
  });

  it('applyThemeTokens は空オブジェクトでもエラーにならない', () => {
    expect(() => applyThemeTokens({})).not.toThrow();
  });

  it('applyThemeTokens は複数トークンをまとめて設定できる', () => {
    applyThemeTokens({
      'md-sys-color-primary': '#111111',
      'md-sys-color-surface': '#222222',
    });
    const html = document.documentElement;
    expect(html.style.getPropertyValue('--md-sys-color-primary')).toBe('#111111');
    expect(html.style.getPropertyValue('--md-sys-color-surface')).toBe('#222222');
  });
});
