import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
];

export async function getTokenBalance(
  tokenAddress: `0x${string}`,
  wallet: `0x${string}`
) {
  const client = createPublicClient({
    chain: base,
    transport: http(),
  });

  const balance = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet],
  });

  return balance as bigint;
}
