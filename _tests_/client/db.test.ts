import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, dbService } from "../../src/db";

describe("Dexie IndexedDB Service", () => {
  beforeEach(async () => {
    await db.history.clear();
    await db.favorites.clear();
  });

  it("should record and retrieve history items in reverse chronological order", async () => {
    await dbService.recordHistory({
      videoId: "v1",
      title: "First Video",
      authorName: "Author 1",
      thumbnailUrl: "/api/thumbnail/v1",
      duration: "3:45",
    });

    await dbService.recordHistory({
      videoId: "v2",
      title: "Second Video",
      authorName: "Author 2",
      thumbnailUrl: "/api/thumbnail/v2",
      duration: "12:00",
    });

    const history = await dbService.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].videoId).toBe("v2");
    expect(history[1].videoId).toBe("v1");
  });

  it("should add, check and remove favorites", async () => {
    expect(await dbService.isFavorite("fav1")).toBe(false);

    await dbService.addFavorite({
      videoId: "fav1",
      title: "Favorite Video",
      authorName: "Fav Channel",
      thumbnailUrl: "/api/thumbnail/fav1",
    });

    expect(await dbService.isFavorite("fav1")).toBe(true);
    const favorites = await dbService.getFavorites();
    expect(favorites.length).toBe(1);
    expect(favorites[0].videoId).toBe("fav1");

    await dbService.removeFavorite("fav1");
    expect(await dbService.isFavorite("fav1")).toBe(false);
  });
});
