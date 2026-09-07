'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Icon } from '@/components/ui/icons';
import type { CommentsResponse, CommentData } from '@/lib/types';

export function CommentsSection({ videoId }: { videoId: string }) {
  const [sort, setSort] = useState<'TOP_COMMENTS' | 'NEWEST_FIRST'>('TOP_COMMENTS');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
  } = useInfiniteQuery<CommentsResponse>({
    queryKey: ['comments', videoId, sort],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('sort', sort);
      const cont = pageParam as string | undefined;
      if (cont) params.set('continuation', cont);
      const res = await fetch(`/api/comments/${videoId}?${params.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as CommentsResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.continuation,
  });

  const comments = useMemo(() => data?.pages.flatMap((p) => p.comments) ?? [], [data]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-title-medium">
          コメント
          {data?.pages[0]?.totalComments ? (
            <span className="text-on-surface-variant ml-1">{data.pages[0].totalComments}</span>
          ) : (
            comments.length > 0 && <span className="text-on-surface-variant ml-1">({comments.length})</span>
          )}
        </h2>
        <div className="flex gap-1">
          <button type="button"
            onClick={() => setSort('TOP_COMMENTS')}
            className={`h-8 px-3 rounded-m3-full text-label-medium ${
              sort === 'TOP_COMMENTS' ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-container-high'
            }`}
          >
            トップ順
          </button>
          <button type="button"
            onClick={() => setSort('NEWEST_FIRST')}
            className={`h-8 px-3 rounded-m3-full text-label-medium ${
              sort === 'NEWEST_FIRST' ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-container-high'
            }`}
          >
            新しい順
          </button>
        </div>
      </div>

      {status === 'pending' && (
        <div className="space-y-4 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton has no stable unique identity.
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-10 w-10 rounded-m3-full bg-surface-container-high" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 rounded-m3-xs bg-surface-container-high" />
                <div className="h-3 w-full rounded-m3-xs bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="mt-4 text-body-medium text-error">
          {error instanceof Error ? error.message : 'コメントを取得できませんでした。'}
        </p>
      )}

      {comments.length === 0 && status === 'success' && (
        <p className="mt-4 text-body-medium text-on-surface-variant">コメントはありません。</p>
      )}

      <div className="mt-4 space-y-5">
        {comments.map((c) => (
          <CommentItem
            key={c.commentId}
            comment={c}
            expanded={!!expanded[c.commentId]}
            onToggle={() => toggleExpand(c.commentId)}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="h-px" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <span className="text-body-medium text-on-surface-variant">読み込み中…</span>
        </div>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  expanded,
  onToggle,
}: {
  comment: CommentData;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="h-10 w-10 shrink-0 rounded-m3-full bg-surface-container-high overflow-hidden">
        {comment.authorAvatar ? (
          <Image src={comment.authorAvatar} alt="" width={40} height={40} className="object-cover" unoptimized />
        ) : (
          <div className="grid place-items-center h-full w-full text-on-surface-variant">
            <Icon name="channel" size={20} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-label-large">{comment.authorName}</span>
          {comment.isChannelOwner && (
            <span className="px-1.5 py-0.5 rounded-m3-xs bg-surface-container-high text-label-small text-on-surface-variant">
              チャンネル
            </span>
          )}
          {comment.isPinned && <span className="text-label-small text-primary">📌 固定</span>}
        </div>
        <p className="mt-1 text-body-medium text-on-surface" style={{ whiteSpace: 'pre-wrap' }}>
          {comment.contentText}
        </p>
        <div className="mt-1.5 flex items-center gap-4 text-label-small text-on-surface-variant">
          {comment.publishedTime && <span>{comment.publishedTime}</span>}
          {comment.likeCountText ? (
            <span className="flex items-center gap-1">
              <Icon name="thumb-up" size={14} />
              {comment.likeCountText}
            </span>
          ) : null}
          {comment.replyCount != null && comment.replyCount > 0 && (
            <button type="button" onClick={onToggle} className="hover:text-primary text-label-medium">
              {expanded ? '返信を折りたたむ' : `${comment.replyCount} 件の返信`}
            </button>
          )}
        </div>
        {expanded && comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-2 border-l-2 border-outline-variant space-y-3">
            {comment.replies.map((r) => (
              <CommentItem key={r.commentId} comment={r} expanded={false} onToggle={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
