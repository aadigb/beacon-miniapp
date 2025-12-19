// src/app/api/projects/route.ts
import { isContractOwner } from "../../../server/onchain/isContractAdmin";
import { isTrustedUser } from "../../../server/farcaster/isTrustedUser";
import { NextRequest, NextResponse } from "next/server";
import {
  listProjectsWithCounts,
  createProject,
} from "../../../server/db";

export async function GET() {
  const projects = await listProjectsWithCounts();
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

 const wallet = adminWallet.toLowerCase();

const isTrusted = await isTrustedUser(adminFid);

if (!isTrusted) {
  return NextResponse.json(
    { error: "User does not meet trust requirements" },
    { status: 403 }
  );
}


const project = await createProject({
  tokenSymbol,
  tokenAddress,
  chain,
  adminWallet: wallet,
  adminFid,
  adminUsername,
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
