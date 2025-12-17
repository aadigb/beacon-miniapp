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
    } = body ?? {};

    if (!tokenAddress || !adminWallet || typeof adminFid !== "number") {
      return NextResponse.json(
        { error: "tokenAddress, adminWallet, and adminFid are required" },
        { status: 400 }
      );
    }

    const project = createProject({
      tokenSymbol: (tokenSymbol || "$TOKEN").trim(),
      tokenAddress: tokenAddress.trim(),
      chain: (chain || "base-mainnet").trim(),
      adminWallet: adminWallet.toLowerCase(),
      adminFid,
      adminUsername: adminUsername || "",
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    console.error("POST /api/projects error", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
