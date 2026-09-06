import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "../../src/components/Header";
import { RelatedVideos } from "../../src/components/RelatedVideos";
import { VideoCard } from "../../src/components/VideoCard";

describe("UI Components", () => {
  it("renders Header with logo and search input", () => {
    const onSearch = vi.fn();
    const onHomeClick = vi.fn();
    const onHistoryClick = vi.fn();
    const onFavoritesClick = vi.fn();

    render(
      <Header
        onSearch={onSearch}
        onHomeClick={onHomeClick}
        onHistoryClick={onHistoryClick}
        onFavoritesClick={onFavoritesClick}
        currentQuery=""
      />,
    );

    expect(screen.getByText("ytdl")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("動画を検索...")).toBeInTheDocument();
  });

  it("renders VideoCard with title and author", () => {
    const video = {
      id: "abc123",
      title: "Test Video Title",
      author: {
        name: "Test Channel",
      },
      duration: "10:00",
      views: "1M views",
      thumbnails: [{ url: "/api/thumbnail/abc123" }],
    };

    const onClick = vi.fn();
    render(<VideoCard video={video} onClick={onClick} layout="grid" />);

    expect(screen.getByText("Test Video Title")).toBeInTheDocument();
    expect(screen.getByText("Test Channel")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("renders RelatedVideos list", () => {
    const videos = [
      {
        id: "rel1",
        title: "Related Video 1",
        author: { name: "Channel 1" },
        thumbnails: [],
      },
      {
        id: "rel2",
        title: "Related Video 2",
        author: { name: "Channel 2" },
        thumbnails: [],
      },
    ];

    const onClick = vi.fn();
    render(<RelatedVideos videos={videos} onVideoClick={onClick} />);

    expect(screen.getByText("関連動画")).toBeInTheDocument();
    expect(screen.getByText("Related Video 1")).toBeInTheDocument();
    expect(screen.getByText("Related Video 2")).toBeInTheDocument();
  });
});
