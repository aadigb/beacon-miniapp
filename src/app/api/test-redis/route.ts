import { NextResponse } from "next/server";
import { redis } from "../../../server/redis";

export async function GET() {
  const result = await redis.get("item");
  return NextResponse.json({ result }, { status: 200 });
}

export async function POST() {
  await redis.set("item", { hello: "world" });
  return NextResponse.json({ ok: true }, { status: 200 });
}
