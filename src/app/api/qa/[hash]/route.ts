import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { hash: string } }
) {
  const hash = params.hash;

  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/cast/replies?hash=${hash}&limit=50`,
    {
      headers: {
        accept: "application/json",
        api_key: process.env.NEYNAR_API_KEY!,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    );
  }

  const data = await res.json();

  const replies = data.casts
    .map((c: any) => ({
      hash: c.hash,
      text: c.text,
      author: c.author.username,
      fid: c.author.fid,
      likes: c.reactions.likes_count,
      recasts: c.reactions.recasts_count,
      replies: c.replies.count,
      score:
        c.reactions.likes_count * 2 +
        c.reactions.recasts_count +
        c.replies.count,
    }))
    .sort((a: any, b: any) => b.score - a.score);

  return NextResponse.json({ replies });
}
