import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.authorFid || !body?.authorUsername) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // TODO: replace with Neynar cast creation (next step)
  const fakeCastHash = nanoid();

  const session = {
    id: nanoid(),
    castHash: fakeCastHash,
    authorFid: body.authorFid,
    authorUsername: body.authorUsername,
    title: body.title,
    createdAt: Date.now(),
    active: true,
  };

  await kv.set(`qa:session:${session.id}`, session);
  await kv.lpush("qa:sessions", session.id);

  return NextResponse.json({ session });
}

export async function GET() {
  const ids = await kv.lrange<string>("qa:sessions", 0, -1);
  const sessions = await Promise.all(
    ids.map((id) => kv.get(`qa:session:${id}`))
  );

  return NextResponse.json({
    sessions: sessions.filter(Boolean),
  });
}
