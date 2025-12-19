import { NextResponse } from "next/server";
import { fetchCastRepliesSorted } from "../../../../lib/qa";

export async function GET(
  req: Request,
  context: { params: { hash: string } }
) {
  const { hash } = context.params;

  if (!hash) {
    return NextResponse.json(
      { error: "Missing cast hash" },
      { status: 400 }
    );
  }

  try {
    const replies = await fetchCastRepliesSorted(hash);

    return NextResponse.json({
      hash,
      replies,
    });
  } catch (err) {
    console.error("QA replies fetch failed", err);
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}
