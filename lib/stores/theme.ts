import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_SEED,
  DEFAULT_TONE,
  generateDynamicTheme,
  applyThemeTokens,
  toneTokens,
  type ThemeMode,
  type ToneId,
} from '@/lib/theme';

export type ThemePreference = ThemeMode | 'system';
export type ThemeDynamic = 'off' | 'seed' | 'thumbnail';

interface ThemeState {
  preference: ThemePreference;
  mode: ThemeMode;
  dynamic: ThemeDynamic;
  /** サムネイルから抽出した動的シードカラー */
  seed: string;
  /** プリセット・カラートーン（動的カラーが off のとき使用） */
  tone: ToneId;
  setPreference: (p: ThemePreference) => void;
  setDynamic: (d: ThemeDynamic) => void;
  setSeed: (seed: string) => void;
  setTone: (tone: ToneId) => void;
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
      tone: DEFAULT_TONE,
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
      setTone: (tone) => {
        set({ tone });
        get().apply();
      },
      toggleMode: () => {
        const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: next, preference: next });
        get().apply();
      },
      apply: () => {
        const { preference, dynamic, seed, tone } = get();
        const mode: ThemeMode =
          preference === 'system' ? systemMode() : preference;

        set({ mode });
        const html = document.documentElement;
        html.setAttribute('data-theme', mode);

        // ブラウザのみでトークンを反映（SSR では計算しない）
        if (typeof window !== 'undefined') {
          if (dynamic === 'off') {
            // プリセット・カラートーン（設計仕様書の base/surface/accent）
            const tokens = toneTokens(tone, mode);
            applyThemeTokens(tokens);
          } else {
            // 動的カラー（seed / thumbnail）を従来どおり使用（共存）
            void generateDynamicTheme(seed, mode).then((tokens) =>
              applyThemeTokens(tokens),
            );
          }
        }
      },
    }),
    {
      name: 'ytdl-theme',
      partialize: (s) => ({
        preference: s.preference,
        dynamic: s.dynamic,
        seed: s.seed,
        tone: s.tone,
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
