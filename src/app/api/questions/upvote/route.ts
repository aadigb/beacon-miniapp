// src/app/api/questions/upvote/route.ts
import { NextResponse } from "next/server";
import { upvoteQuestion } from "../../../../server/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const questionId =
    typeof (body as any).questionId === "string" ? (body as any).questionId : "";
  const walletAddressRaw =
    typeof (body as any).walletAddress === "string"
      ? (body as any).walletAddress
      : "";

  const walletAddress = walletAddressRaw.trim().toLowerCase();

  if (!questionId || !walletAddress) {
    return NextResponse.json(
      { error: "Missing questionId or walletAddress" },
      { status: 400 }
    );
  }

  // Supports either sync or async db function
  const updated = await Promise.resolve(
    (upvoteQuestion as any)({ questionId, walletAddress })
  );

  if (!updated) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({ question: updated });
}
