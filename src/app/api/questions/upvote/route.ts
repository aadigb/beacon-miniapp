// src/app/api/questions/upvote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { upvoteQuestion } from "../../../../server/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || !body.questionId || !body.walletAddress) {
    return NextResponse.json(
      { error: "Missing questionId or walletAddress" },
      { status: 400 }
    );
  }

  const { questionId, walletAddress } = body;

  const updated = await upvoteQuestion({
    questionId,
    walletAddress,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ question: updated });
}
