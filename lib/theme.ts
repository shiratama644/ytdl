/**
 * Material 3 Expressive の動的カラー生成。
 * @material/material-color-utilities の HCT 空間でシードカラーからトークンを算出し、
 * CSS カスタムプロパティ（--md-sys-color-*）として DOM に反映する。
 *
 * 注意: material-color-utilities は内部で拡張子なしの ESM import を使うため、厳格な Node ESM
 * ではトップレベル import が失敗し得る。そこでこのモジュールは「ブラウザ実行時のみ」の
 * 動的 import で当該ライブラリを読み込む（SSR では決して評価しない）。
 */
export type ThemeMode = 'light' | 'dark';

/**
 * カラートーンプリセット（設計仕様書 §2）。
 * M3 動的抽出ではなく、ユーザーが自ら世界観を選べるプロ仕様トーン。
 * base/surface/accent を起点に、60-30-10 のカラーバランスでトークンを導出する。
 */
export type ToneId = 'obsidian-frost' | 'smoky-quartz' | 'nordic-mist' | 'deep-forest';

export interface TonePreset {
  id: ToneId;
  /** 表示名 */
  label: string;
  /** テーマ説明（設定シート用） */
  description: string;
  /** ダーク/ライト各モードの起点色 */
  colors: Record<ThemeMode, {
    base: string;
    surface: string;
    surfaceGlass: string;
    accent: string;
    onSurface: string;
    onSurfaceVariant: string;
    outline: string;
  }>;
}

/** カラートーンプリセット定義。 */
export const TONE_PRESETS: TonePreset[] = [
  {
    id: 'obsidian-frost',
    label: 'Obsidian Frost',
    description: 'マット墨黒ベース × フロストシアン。映像が最も映える超低反射ダーク。',
    colors: {
      dark: { base: '#0E1116', surface: '#161B22', surfaceGlass: 'rgba(22, 27, 34, 0.75)', accent: '#38BDF8', onSurface: '#E6EDF3', onSurfaceVariant: 'rgba(230, 237, 243, 0.6)', outline: 'rgba(255, 255, 255, 0.08)' },
      light: { base: '#F8FAFC', surface: '#FFFFFF', surfaceGlass: 'rgba(255, 255, 255, 0.7)', accent: '#2563EB', onSurface: '#0F172A', onSurfaceVariant: 'rgba(15, 23, 42, 0.6)', outline: 'rgba(15, 23, 42, 0.08)' },
    },
  },
  {
    id: 'smoky-quartz',
    label: 'Smoky Quartz',
    description: '温かみある濃炭 × ローズクリムゾン。映画・エンタメ視聴向けリッチトーン。',
    colors: {
      dark: { base: '#141216', surface: '#1C1A20', surfaceGlass: 'rgba(32, 28, 36, 0.75)', accent: '#F43F5E', onSurface: '#F4F0F2', onSurfaceVariant: 'rgba(244, 240, 242, 0.6)', outline: 'rgba(255, 255, 255, 0.08)' },
      light: { base: '#FAF7F9', surface: '#FFFFFF', surfaceGlass: 'rgba(255, 255, 255, 0.7)', accent: '#E11D48', onSurface: '#1A1417', onSurfaceVariant: 'rgba(26, 20, 23, 0.6)', outline: 'rgba(26, 20, 23, 0.08)' },
    },
  },
  {
    id: 'nordic-mist',
    label: 'Nordic Mist',
    description: 'マットオフ白 × コバルトブルー。昼間閲覧・作業向けの紙のような質感。',
    colors: {
      dark: { base: '#0E1116', surface: '#161B22', surfaceGlass: 'rgba(22, 27, 34, 0.75)', accent: '#38BDF8', onSurface: '#E6EDF3', onSurfaceVariant: 'rgba(230, 237, 243, 0.6)', outline: 'rgba(255, 255, 255, 0.08)' },
      light: { base: '#F8FAFC', surface: '#FFFFFF', surfaceGlass: 'rgba(255, 255, 255, 0.7)', accent: '#2563EB', onSurface: '#0F172A', onSurfaceVariant: 'rgba(15, 23, 42, 0.6)', outline: 'rgba(15, 23, 42, 0.08)' },
    },
  },
  {
    id: 'deep-forest',
    label: 'Deep Forest',
    description: 'マット深緑 × ミントエメラルド。長時間視聴でも刺激が少ない自然派トーン。',
    colors: {
      dark: { base: '#0D1512', surface: '#131E19', surfaceGlass: 'rgba(18, 30, 24, 0.75)', accent: '#34D399', onSurface: '#E5F0EA', onSurfaceVariant: 'rgba(229, 240, 234, 0.6)', outline: 'rgba(255, 255, 255, 0.08)' },
      light: { base: '#F2F7F4', surface: '#FFFFFF', surfaceGlass: 'rgba(255, 255, 255, 0.7)', accent: '#059669', onSurface: '#0D1B14', onSurfaceVariant: 'rgba(13, 27, 20, 0.6)', outline: 'rgba(13, 27, 20, 0.08)' },
    },
  },
];

/** 既定トーン。 */
export const DEFAULT_TONE: ToneId = 'obsidian-frost';

/** トーンIDをプレセットとして返す（無効値は既定トーン）。 */
export function getTonePreset(id: ToneId): TonePreset {
  return TONE_PRESETS.find((t) => t.id === id) ?? TONE_PRESETS[0];
}

const DYNAMIC_THEME_PREFIX = 'md-sys-color';

/**
 * @param seed 16進カラー（例: '#a01c2f'）
 * @param mode 'light' | 'dark'
 * @returns トークンマップ（CSS カスタムプロパティ名 -> 色値）
 */
export async function generateDynamicTheme(
  seed: string,
  mode: ThemeMode,
): Promise<Record<string, string>> {
  const { argbFromHex, hexFromArgb, themeFromSourceColor } = await import(
    '@material/material-color-utilities'
  );
  const theme = themeFromSourceColor(argbFromHex(seed));
  const scheme = mode === 'dark' ? theme.schemes.dark : theme.schemes.light;

  const map: Record<string, string> = {};
  const propMap: Record<string, string> = {
    primary: 'primary',
    'on-primary': 'onPrimary',
    'primary-container': 'primaryContainer',
    'on-primary-container': 'onPrimaryContainer',
    secondary: 'secondary',
    'on-secondary': 'onSecondary',
    'secondary-container': 'secondaryContainer',
    'on-secondary-container': 'onSecondaryContainer',
    tertiary: 'tertiary',
    'on-tertiary': 'onTertiary',
    'tertiary-container': 'tertiaryContainer',
    'on-tertiary-container': 'onTertiaryContainer',
    error: 'error',
    'on-error': 'onError',
    'error-container': 'errorContainer',
    'on-error-container': 'onErrorContainer',
    'surface-dim': 'surfaceDim',
    surface: 'surface',
    'surface-bright': 'surfaceBright',
    'surface-container-lowest': 'surfaceContainerLowest',
    'surface-container-low': 'surfaceContainerLow',
    'surface-container': 'surfaceContainer',
    'surface-container-high': 'surfaceContainerHigh',
    'surface-container-highest': 'surfaceContainerHighest',
    'on-surface': 'onSurface',
    'on-surface-variant': 'onSurfaceVariant',
    'surface-variant': 'surfaceVariant',
    'inverse-surface': 'inverseSurface',
    'inverse-on-surface': 'inverseOnSurface',
    'inverse-primary': 'inversePrimary',
    outline: 'outline',
    'outline-variant': 'outlineVariant',
    scrim: 'scrim',
    shadow: 'shadow',
  };

  for (const [cssName, schemeKey] of Object.entries(propMap)) {
    const value = (scheme as any)[schemeKey];
    if (value !== undefined) {
      map[`${DYNAMIC_THEME_PREFIX}-${cssName}`] = hexFromArgb(value);
    }
  }
  return map;
}

/**
 * 画像からシードカラーを抽出する（ブラウザのみ）。
 */
export async function seedColorFromImage(url: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    const { sourceColorFromImageBytes, hexFromArgb } = await import(
      '@material/material-color-utilities'
    );
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const color = sourceColorFromImageBytes(data);
    if (color !== undefined) return hexFromArgb(color);
    return null;
  } catch {
    return null;
  }
}

/**
 * CSS カスタムプロパティを <html> 要素に一括適用する。
 */
export function applyThemeTokens(tokens: Record<string, string>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--${key}`, value);
  }
}

/**
 * トーンプリセットから M3 互換の CSS トークンマップを生成する（純粋関数）。
 * 60-30-10 のカラーバランスに合わせ、base/surface/accent を主要トークンへ展開する。
 *
 * @returns `--md-sys-color-*` キーのトークンマップ
 */
export function toneTokens(
  id: ToneId,
  mode: ThemeMode,
): Record<string, string> {
  const preset = getTonePreset(id);
  const c = preset.colors[mode];
  return {
    'md-sys-color-background': c.base,
    'md-sys-color-surface': c.surface,
    'md-sys-color-surface-dim': c.base,
    'md-sys-color-on-background': c.onSurface,
    'md-sys-color-on-surface': c.onSurface,
    'md-sys-color-on-surface-variant': c.onSurfaceVariant,
    'md-sys-color-surface-container': c.surface,
    'md-sys-color-surface-container-low': c.surface,
    'md-sys-color-surface-container-high': c.surface,
    'md-sys-color-surface-container-lowest': c.surface,
    'md-sys-color-surface-container-highest': c.surface,
    'md-sys-color-primary': c.accent,
    'md-sys-color-on-primary': mode === 'dark' ? '#0B0F14' : '#FFFFFF',
    'md-sys-color-outline': c.outline,
    'md-sys-color-outline-variant': c.outline,
    // ガラス面（ナビバー / カード）は surface を半透明で。
    'md-sys-color-surface-translucent': c.surfaceGlass,
  };
}

/** 既定のブランドシード（ytdl レッド系） */
export const DEFAULT_SEED = '#a01c2f';
