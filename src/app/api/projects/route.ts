// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listProjectsWithCounts,
  createProject,
} from "../../../server/db";

export async function GET() {
  const projects = listProjectsWithCounts();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      tokenSymbol,
      tokenAddress,
      chain,
      adminWallet,
      adminFid,
      adminUsername,
    } = body || {};

    if (!tokenAddress || !adminWallet || !chain) {
      return NextResponse.json(
        { error: "tokenAddress, chain, and adminWallet are required" },
        { status: 400 }
      );
    }

    const project = createProject({
      tokenSymbol: tokenSymbol || "$TOKEN",
      tokenAddress,
      chain,
      adminWallet,
      adminFid: Number(adminFid ?? 0),
      adminUsername: adminUsername || "anon",
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("Error in POST /api/projects:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
