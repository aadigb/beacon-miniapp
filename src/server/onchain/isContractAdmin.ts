import { createPublicClient, http, getAddress } from "viem";
import { base } from "viem/chains";

const ownerAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export async function isContractOwner(
  tokenAddress: string,
  walletAddress: string
): Promise<boolean> {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.ALCHEMY_RPC_URL!),
    });

    const owner = await client.readContract({
      address: getAddress(tokenAddress),
      abi: ownerAbi,
      functionName: "owner",
    });

    return owner.toLowerCase() === walletAddress.toLowerCase();
  } catch (err) {
    // contract has no owner() or call failed
    return false;
  }
}
