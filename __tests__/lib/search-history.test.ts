import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SearchHistoryDb,
  SEARCH_HISTORY_LIMIT,
  addSearchHistory,
  recentSearchHistory,
  clearSearchHistory,
  __setSearchHistoryDbForTest,
  __resetSearchHistoryDbForTest,
} from '@/lib/search-history';

describe('search-history (Dexie / IndexedDB)', () => {
  let db: SearchHistoryDb;

  beforeEach(() => {
    // テストごとに新しいインメモリ IndexedDB（fake-indexeddb）を使う。
    // addSearchHistory 等は内部で getSearchHistoryDb() を参照するため、シングルトンを差し替える。
    db = new SearchHistoryDb(`test-ytdl-search-history-${Math.random().toString(36).slice(2)}`);
    __setSearchHistoryDbForTest(db);
  });

  afterEach(async () => {
    await db.delete();
    __resetSearchHistoryDbForTest();
  });

  it('addSearchHistory はクエリを保存し、recentSearchHistory で降順に返す', async () => {
    await addSearchHistory('cute cats');
    await addSearchHistory('lofi beats');
    const recent = await recentSearchHistory();
    expect(recent).toContain('cute cats');
    expect(recent).toContain('lofi beats');
    // 直近に追加した方が先頭に来る。
    expect(recent[0]).toBe('lofi beats');
  });

  it('同一クエリを再追加しても重複せず visitedAt で先頭に来る', async () => {
    await addSearchHistory('first query');
    await addSearchHistory('second query');
    // first query を再検索 → visitedAt 更新で先頭へ。
    await addSearchHistory('first query');
    const recent = await recentSearchHistory();
    expect(recent.filter((q) => q === 'first query')).toHaveLength(1);
    expect(recent[0]).toBe('first query');
  });

  it('空白のみのクエリは保存しない', async () => {
    await addSearchHistory('   ');
    const recent = await recentSearchHistory();
    expect(recent).toHaveLength(0);
  });

  it('上限（SEARCH_HISTORY_LIMIT）を超えると古い履歴が削除される', async () => {
    for (let i = 0; i < SEARCH_HISTORY_LIMIT + 5; i++) {
      await addSearchHistory(`query-${i}`);
    }
    const recent = await recentSearchHistory();
    expect(recent.length).toBeLessThanOrEqual(SEARCH_HISTORY_LIMIT);
    // 最も古い query-0 は消えているはず。
    expect(recent).not.toContain('query-0');
    // 最新のものは残っている。
    expect(recent[0]).toBe(`query-${SEARCH_HISTORY_LIMIT + 4}`);
  });

  it('clearSearchHistory は全履歴を削除する', async () => {
    await addSearchHistory('a');
    await addSearchHistory('b');
    await clearSearchHistory();
    const recent = await recentSearchHistory();
    expect(recent).toHaveLength(0);
  });
});
