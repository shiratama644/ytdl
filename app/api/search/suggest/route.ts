import { type NextRequest, NextResponse } from 'next/server';
import { getInnertube } from '@/lib/innertube';

export const dynamic = 'force-dynamic';

/**
 * 検索サジェスト（予測変換）エンドポイント。
 *
 * youtubei.js の Innertube.getSearchSuggestions(query) が、YouTube 検索バーの
 * 非公式サジェスト（suggestqueries-clients6.youtube.com）をラップして返す。
 * 呼び出し側（NavBar 検索窓）が debounce して 3 文字以上で叩く。
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ suggestions: [] });
  }
  const query = q.trim();

  try {
    const yt = await getInnertube();
    const suggestions = (await yt.getSearchSuggestions(query)) ?? [];
    return NextResponse.json({ q: query, suggestions });
  } catch (e) {
    // サジェストは補助機能なので、失敗しても空配列を返して UI を壊さない。
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ q: query, suggestions: [], error: msg }, { status: 502 });
  }
}
