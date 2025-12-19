import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.fid || !body?.target) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await kv.sadd(`subs:${body.fid}`, body.target);

  return NextResponse.json({ ok: true });
}
