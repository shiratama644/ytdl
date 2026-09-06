'use client';

import React from 'react';

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

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M12 3 3 10v10h6v-6h6v6h6V10z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  download: <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19h16" />,
  play: <path d="M8 5v14l11-7z" />,
  shorts: <path d="M17 5H7a5 5 0 0 0-5 5v4a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V10a5 5 0 0 0-5-5zm-5 4 4 3-4 3z" />,
  live: <path d="M8 5v14l11-7z" />,
  channel: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-7 2-7 5v2h14v-2c0-3-3-5-7-5z" />,
  settings: <path d="M19 13h.01M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 13l4 4L19 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  share: <path d="M18 8a3 3 0 1 0-2.8-4H8.8A3 3 0 1 0 6 8.2V15.8A3 3 0 1 0 8.8 20h6.4a3 3 0 1 0 .8-2H8.8a3 3 0 0 0-.8-.3V8.3a3 3 0 0 0 .8-.3z" />,
  'thumb-up': <path d="M14 5h-3l-4 5v9h7l2-6V5a2 2 0 0 0-2-2zM7 10H5v9h2z" />,
  comment: <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />,
  queue: <path d="M3 6h12M3 12h8M3 18h8M17 12v6m-3-3h6" />,
  pause: <path d="M7 5h4v14H7zM13 5h4v14h-4z" />,
  'play-arrow': <path d="M8 5v14l11-7z" />,
  stop: <path d="M7 7h10v10H7z" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  remove: <path d="M6 6l12 12M18 6 6 18" />,
  'arrow-up': <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  'arrow-down': <path d="M12 5v14m0 0 6-6m-6 6-6-6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  list: <path d="M4 6h16M4 12h16M4 18h16M8 6v12" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  back: <path d="M19 12H5m0 0 6 6m-6-6 6-6" />,
  forward: <path d="M5 12h14m0 0-6 6m6-6-6-6" />,
  sparkle: <path d="M12 3l1.7 4.6L18.3 9l-4.6 1.7L12 15l-1.7-4.3L5.7 9l4.6-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
