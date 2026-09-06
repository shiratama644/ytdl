import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SEED, generateDynamicTheme, applyThemeTokens, type ThemeMode } from '@/lib/theme';

export type ThemePreference = ThemeMode | 'system';
export type ThemeDynamic = 'off' | 'seed' | 'thumbnail';

interface ThemeState {
  preference: ThemePreference;
  mode: ThemeMode;
  dynamic: ThemeDynamic;
  /** サムネイルから抽出した動的シードカラー */
  seed: string;
  setPreference: (p: ThemePreference) => void;
  setDynamic: (d: ThemeDynamic) => void;
  setSeed: (seed: string) => void;
  toggleMode: () => void;
  apply: () => void;
}

function systemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      mode: 'dark',
      dynamic: 'off',
      seed: DEFAULT_SEED,
      setPreference: (p) => {
        set({ preference: p });
        get().apply();
      },
      setDynamic: (d) => {
        set({ dynamic: d });
        get().apply();
      },
      setSeed: (seed) => {
        set({ seed });
        get().apply();
      },
      toggleMode: () => {
        const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: next, preference: next });
        get().apply();
      },
      apply: () => {
        const { preference, dynamic, seed } = get();
        const mode: ThemeMode =
          preference === 'system' ? systemMode() : preference;
        // dynamic が 'off' なら既定ブランド、それ以外はユーザー/サムネイル由来のシードを使用
        const dynamicSeed = dynamic === 'off' ? DEFAULT_SEED : seed;

        set({ mode });
        const html = document.documentElement;
        html.setAttribute('data-theme', mode);

        // 動的トークンはブラウザのみで計算（SSR では計算しない）
        if (typeof window !== 'undefined') {
          void generateDynamicTheme(dynamicSeed, mode).then((tokens) =>
            applyThemeTokens(tokens),
          );
        }
      },
    }),
    {
      name: 'ytdl-theme',
      partialize: (s) => ({
        preference: s.preference,
        dynamic: s.dynamic,
        seed: s.seed,
      }),
    },
  ),
);

/** システムテーマ変更やページロード時にテーマを一括適用する（クライアントのみ）。 */
export function initTheme(): void {
  if (typeof window === 'undefined') return;
  useThemeStore.getState().apply();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    useThemeStore.getState().apply();
  });
}
