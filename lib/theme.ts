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

/** 既定のブランドシード（ytdl レッド系） */
export const DEFAULT_SEED = '#a01c2f';
