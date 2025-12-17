// src/app/api/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listQuestionsForProject,
  createQuestion,
  getProjectById,
} from "../../../server/db";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId query param is required" },
      { status: 400 }
    );
  }

  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  const questions = listQuestionsForProject(projectId);
  return NextResponse.json({ questions, project });
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
    } = body || {};

    if (!projectId || !text || !walletAddress) {
      return NextResponse.json(
        { error: "projectId, text, walletAddress are required" },
        { status: 400 }
      );
    }

    const project = getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const question = createQuestion({
      projectId,
      text,
      authorFid: Number(authorFid ?? 0),
      authorUsername: authorUsername || "anon",
      walletAddress,
    });

    return NextResponse.json({ question });
  } catch (err) {
    console.error("Error in POST /api/questions:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
