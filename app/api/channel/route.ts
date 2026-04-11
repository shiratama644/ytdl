import { NextResponse } from "next/server";
import { channelQuerySchema } from "@/lib/schemas";
import { getChannelPayload } from "@/lib/data";

export async function GET(request: Request) {
  const query = channelQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!query.success) {
    return NextResponse.json({ error: query.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const channel = await getChannelPayload(query.data.id);
    return NextResponse.json(channel);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
