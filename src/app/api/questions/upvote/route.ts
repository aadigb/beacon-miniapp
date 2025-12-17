// src/app/api/questions/upvote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { upvoteQuestion } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionId, walletAddress } = body || {};

    if (!questionId || !walletAddress) {
      return NextResponse.json(
        { error: "questionId and walletAddress are required" },
        { status: 400 }
      );
    }

    const updated = upvoteQuestion(questionId, walletAddress);
    if (!updated) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ question: updated });
  } catch (err) {
    console.error("Error in POST /api/questions/upvote:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
