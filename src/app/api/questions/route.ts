// src/app/api/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listQuestionsByProject,
  createQuestion,
} from "../../../server/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  const questions = listQuestionsByProject(projectId);
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      text,
      authorFid,
      authorUsername,
      walletAddress,
    } = body ?? {};

    if (!projectId || !text || !walletAddress || typeof authorFid !== "number") {
      return NextResponse.json(
        { error: "projectId, text, walletAddress, authorFid are required" },
        { status: 400 }
      );
    }

    const question = createQuestion({
      projectId,
      text: String(text).slice(0, 500), // simple guard
      authorFid,
      authorUsername: authorUsername || "",
      walletAddress: walletAddress.toLowerCase(),
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    console.error("POST /api/questions error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
