import { NextResponse } from "next/server";
import { getTopVideos } from "@/lib/data";

export async function GET() {
  try {
    const videos = await getTopVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
