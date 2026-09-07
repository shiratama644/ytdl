import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlayerSettings {
  /** 画質固定（null は自動）。'auto' は YouTube の自動/最高。 */
  quality: 'auto' | '144p' | '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p';
  playbackRate: number;
  volume: number;
  muted: boolean;
  /** ミニプレイヤーでページ遷移をまたいで再生を継続するか */
  miniPlayer: boolean;
}

interface PlayerState extends PlayerSettings {
  setSetting: <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => void;
  reset: () => void;
}

const defaults: PlayerSettings = {
  quality: 'auto',
  playbackRate: 1,
  volume: 1,
  muted: false,
  miniPlayer: true,
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      ...defaults,
      setSetting: (key, value) => set({ [key]: value } as Partial<PlayerState>),
      reset: () => set(defaults),
    }),
    {
      name: 'ytdl-player',
      partialize: (s) => ({
        quality: s.quality,
        playbackRate: s.playbackRate,
        volume: s.volume,
        muted: s.muted,
        miniPlayer: s.miniPlayer,
      }),
    },
  ),
);
