import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/lib/stores/player';

describe('usePlayerStore', () => {
  beforeEach(() => {
    usePlayerStore.getState().reset();
  });

  it('既定値', () => {
    const s = usePlayerStore.getState();
    expect(s.quality).toBe('auto');
    expect(s.playbackRate).toBe(1);
    expect(s.volume).toBe(1);
    expect(s.muted).toBe(false);
    expect(s.miniPlayer).toBe(true);
  });

  it('setSetting で個別に更新できる', () => {
    usePlayerStore.getState().setSetting('quality', '1080p');
    usePlayerStore.getState().setSetting('volume', 0.5);
    const s = usePlayerStore.getState();
    expect(s.quality).toBe('1080p');
    expect(s.volume).toBe(0.5);
  });

  it('reset で既定値に戻る', () => {
    usePlayerStore.getState().setSetting('quality', '720p');
    usePlayerStore.getState().setSetting('muted', true);
    usePlayerStore.getState().reset();
    const s = usePlayerStore.getState();
    expect(s.quality).toBe('auto');
    expect(s.muted).toBe(false);
  });
});
