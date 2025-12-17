import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress } from "viem";
import { base } from "viem/chains";

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenAddress = searchParams.get("tokenAddress");
  const walletAddress = searchParams.get("walletAddress");

  if (!tokenAddress || !walletAddress) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return NextResponse.json({ error: "Missing ALCHEMY_API_KEY" }, { status: 500 });
  }

  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  try {
    const balance = await client.readContract({
      address: getAddress(tokenAddress),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(walletAddress)],
    });

    return NextResponse.json({
      isHolder: balance > 0n,
      balance: balance.toString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to check holder" },
      { status: 500 }
    );
  }
}
