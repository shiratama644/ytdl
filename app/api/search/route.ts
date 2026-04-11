import { NextResponse } from "next/server";
import { searchQuerySchema } from "@/lib/schemas";
import { getSearchVideos } from "@/lib/data";

export async function GET(request: Request) {
  const query = searchQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success) {
    return NextResponse.json({ error: query.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const videos = await getSearchVideos(query.data.q);
    return NextResponse.json({ videos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
