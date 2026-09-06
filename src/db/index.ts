import Dexie, { type EntityTable } from "dexie";

export interface HistoryItem {
  id?: number;
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
  duration?: string;
  watchedAt: number; // timestamp
}

export interface FavoriteItem {
  id?: number;
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
  duration?: string;
  addedAt: number; // timestamp
}

export interface AppSetting {
  key: string;
  value: string;
}

const db = new Dexie("ytdlDB") as Dexie & {
  history: EntityTable<HistoryItem, "id">;
  favorites: EntityTable<FavoriteItem, "id">;
  settings: EntityTable<AppSetting, "key">;
};

// スキーマ定義
db.version(1).stores({
  history: "++id, videoId, watchedAt, title",
  favorites: "++id, videoId, addedAt, title",
  settings: "key",
});

export const dbService = {
  // 履歴
  async recordHistory(item: Omit<HistoryItem, "id" | "watchedAt">): Promise<void> {
    try {
      // 既存の同一 videoId を削除して最新として追加
      const existing = await db.history.where("videoId").equals(item.videoId).toArray();
      if (existing.length > 0) {
        const ids = existing.map((e) => e.id).filter((id): id is number => id !== undefined);
        await db.history.bulkDelete(ids);
      }
      await db.history.add({
        ...item,
        watchedAt: Date.now(),
      });
    } catch (err) {
      console.error("[DB] Failed to record history:", err);
    }
  },

  async getHistory(limit = 100): Promise<HistoryItem[]> {
    try {
      return await db.history.orderBy("watchedAt").reverse().limit(limit).toArray();
    } catch (err) {
      console.error("[DB] Failed to get history:", err);
      return [];
    }
  },

  async deleteHistoryItem(id: number): Promise<void> {
    await db.history.delete(id);
  },

  async clearHistory(): Promise<void> {
    await db.history.clear();
  },

  // お気に入り
  async addFavorite(item: Omit<FavoriteItem, "id" | "addedAt">): Promise<void> {
    try {
      const existing = await db.favorites.where("videoId").equals(item.videoId).first();
      if (!existing) {
        await db.favorites.add({
          ...item,
          addedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("[DB] Failed to add favorite:", err);
    }
  },

  async removeFavorite(videoId: string): Promise<void> {
    try {
      const existing = await db.favorites.where("videoId").equals(videoId).toArray();
      const ids = existing.map((e) => e.id).filter((id): id is number => id !== undefined);
      await db.favorites.bulkDelete(ids);
    } catch (err) {
      console.error("[DB] Failed to remove favorite:", err);
    }
  },

  async isFavorite(videoId: string): Promise<boolean> {
    try {
      const count = await db.favorites.where("videoId").equals(videoId).count();
      return count > 0;
    } catch {
      return false;
    }
  },

  async getFavorites(limit = 100): Promise<FavoriteItem[]> {
    try {
      return await db.favorites.orderBy("addedAt").reverse().limit(limit).toArray();
    } catch (err) {
      console.error("[DB] Failed to get favorites:", err);
      return [];
    }
  },
};

export { db };
