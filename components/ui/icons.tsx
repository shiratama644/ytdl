'use client';

/**
 * Material Symbols (Rounded) のアイコンフォントを使った Icon コンポーネント。
 *
 * フォントは node_modules の material-symbols パッケージ（Rounded 変数フォント）を
 * 自己ホストで読み込む。アイコンはリガチャ（アイコン名をテキストで書くと対応グリフに
 * 置換される）で描画する。
 *
 * font-variation-settings で FILL / wght / GRAD / opsz を調整できる（既定は line アイコン相当）。
 */

export type IconName =
  | 'home'
  | 'search'
  | 'download'
  | 'play'
  | 'shorts'
  | 'live'
  | 'channel'
  | 'settings'
  | 'close'
  | 'check'
  | 'menu'
  | 'more'
  | 'share'
  | 'thumb-up'
  | 'comment'
  | 'queue'
  | 'pause'
  | 'play-arrow'
  | 'stop'
  | 'expand'
  | 'remove'
  | 'arrow-up'
  | 'arrow-down'
  | 'sun'
  | 'moon'
  | 'list'
  | 'grid'
  | 'calendar'
  | 'back'
  | 'forward'
  | 'sparkle';

/** Material Symbols のリガチャ名（アイコン名。_ 区切り）。 */
const glyphs: Record<IconName, string> = {
  home: 'home',
  search: 'search',
  download: 'download',
  play: 'play_arrow',
  shorts: 'play_arrow',
  live: 'sensors',
  channel: 'account_circle',
  settings: 'settings',
  close: 'close',
  check: 'check',
  menu: 'menu',
  more: 'more_horiz',
  share: 'share',
  'thumb-up': 'thumb_up',
  comment: 'comment',
  queue: 'queue_music',
  pause: 'pause',
  'play-arrow': 'play_arrow',
  stop: 'stop',
  expand: 'expand',
  remove: 'close',
  'arrow-up': 'arrow_upward',
  'arrow-down': 'arrow_downward',
  sun: 'light_mode',
  moon: 'dark_mode',
  list: 'list',
  grid: 'grid_view',
  calendar: 'calendar_today',
  back: 'arrow_back',
  forward: 'arrow_forward',
  sparkle: 'auto_awesome',
};

export function Icon({
  name,
  size = 24,
  className = '',
  fill = false,
}: {
  name: IconName;
  size?: number;
  className?: string;
  fill?: boolean;
}) {
  // fill は Material Symbols の FILL axis で表現する（fill=true で塗りつぶし）。
  const variation = `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 48`;
  return (
    <span
      className={`material-symbols-rounded ${className}`.trim()}
      style={{ fontSize: size, fontVariationSettings: variation }}
      aria-hidden="true"
    >
      {glyphs[name]}
    </span>
  );
}
