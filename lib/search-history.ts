'use client';

import Dexie, { type Table } from 'dexie';

/**
 * 検索履歴の保存先（IndexedDB / Dexie.js）。
 *
 * - ブラウザの IndexedDB を Dexie の型付きテーブルでラップする。
 * - 履歴は「クエリごとに1件」を保ち、同じクエリを再検索したら日時を更新して
 *   先頭に持ってくる（重複を避ける）。
 * - 直近 N 件（既定 10）だけを保持し、超過分は削除する。
 *
 * 注意:
 * - このモジュールはブラウザ専用（`'use client'`）。SSR（Node）では import しない。
 * - jsdom（vitest）では `fake-indexeddb` をポリフィルとして使う。
 */

export interface SearchHistoryEntry {
  /** 主キー（自動採番） */
  id?: number;
  /** 検索クエリ */
  query: string;
  /** 最後に検索した時刻（エポックミリ秒） */
  visitedAt: number;
}

/** 本番/テスト共通で使うデータベース名。 */
export const SEARCH_HISTORY_DB_NAME = 'ytdl-search-history';
/** 保持する履歴の最大件数。 */
export const SEARCH_HISTORY_LIMIT = 10;

export class SearchHistoryDb extends Dexie {
  /** 検索履歴テーブル（query を index 化）。 */
  searchHistory!: Table<SearchHistoryEntry, number>;

  constructor(name = SEARCH_HISTORY_DB_NAME) {
    super(name);
    this.version(1).stores({
      searchHistory: '++id, query, visitedAt',
    });
  }
}

/** シングルトン DB（ブラウザで一度だけ生成）。 */
let db: SearchHistoryDb | null = null;

export function getSearchHistoryDb(): SearchHistoryDb {
  if (typeof window === 'undefined') {
    throw new Error('search-history is browser-only.');
  }
  if (!db) db = new SearchHistoryDb();
  return db;
}

/**
 * テスト用: DB を注入する（シングルトンを差し替える）。
 * テストでは新規インメモリ DB を渡すことで、`addSearchHistory` 等を分離できる。
 */
export function __setSearchHistoryDbForTest(d: SearchHistoryDb | null): void {
  db = d;
}

/**
 * テスト用: シングルトン DB をリセットする（afterEach で呼ぶ）。
 */
export function __resetSearchHistoryDbForTest(): void {
  db = null;
}

/**
 * 検索履歴にクエリを記録する。
 * 同じクエリは既存行の visitedAt だけ更新し、上限件数を超えたら古い行を削除する。
 */
export async function addSearchHistory(query: string): Promise<void> {
  const q = query.trim();
  if (q.length === 0) return;
  const d = getSearchHistoryDb();
  const now = Date.now();
  // 同一クエリがあれば更新、無ければ追加。id で一意化するため query で検索して追記。
  const existing = await d.searchHistory.where('query').equals(q).first();
  if (existing) {
    await d.searchHistory.update(existing.id as number, { visitedAt: now });
  } else {
    await d.searchHistory.add({ query: q, visitedAt: now });
  }
  // 上限を超えた古い行を削除（visitedAt の昇順で余分を刈り取る）。
  await trimSearchHistory();
}

/** visitedAt 降順で直近 N 件を返す。 */
export async function recentSearchHistory(limit = SEARCH_HISTORY_LIMIT): Promise<string[]> {
  const d = getSearchHistoryDb();
  const rows = await d.searchHistory
    .orderBy('visitedAt')
    .reverse()
    .limit(limit)
    .toArray();
  return rows.map((r) => r.query);
}

/** 上限を超えた古い行を削除する。 */
export async function trimSearchHistory(limit = SEARCH_HISTORY_LIMIT): Promise<void> {
  const d = getSearchHistoryDb();
  const all = await d.searchHistory.orderBy('visitedAt').reverse().toArray();
  const overflow = all.slice(limit);
  await d.searchHistory.bulkDelete(overflow.map((r) => r.id as number));
}

/** 検索履歴を全削除する。 */
export async function clearSearchHistory(): Promise<void> {
  const d = getSearchHistoryDb();
  await d.searchHistory.clear();
}
