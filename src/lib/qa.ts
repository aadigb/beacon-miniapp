import { getNeynarClient } from "./neynar";

/**
 * Canonical reply shape used by Beacon
 * (local definition avoids TS import issues)
 */
export type QACastReply = {
  hash: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  likes: number;
  recasts: number;
  replies: number;
  timestamp: number;
};

export async function fetchCastRepliesSorted(
  castHash: string
): Promise<QACastReply[]> {
  const client = getNeynarClient();

  // Neynar SDK typings are incomplete → cast to any is REQUIRED
  const res = await (client as any).fetchCastConversation({
    identifier: castHash,
    type: "hash",
    replyDepth: 1,
  });

  const casts: any[] = Array.isArray(res?.casts) ? res.casts : [];

  const replies: QACastReply[] = casts
    .filter((cast) => cast.parent_hash === castHash)
    .map((cast) => ({
      hash: cast.hash,
      text: cast.text ?? "",
      authorFid: cast.author?.fid ?? 0,
      authorUsername: cast.author?.username ?? "anon",
      likes: cast.reactions?.likes_count ?? 0,
      recasts: cast.reactions?.recasts_count ?? 0,
      replies: cast.replies?.count ?? 0,
      timestamp: new Date(cast.timestamp).getTime(),
    }));

  // 🔥 Engagement-first ranking
  replies.sort((a, b) => {
    if (b.likes !== a.likes) return b.likes - a.likes;
    if (b.recasts !== a.recasts) return b.recasts - a.recasts;
    if (b.replies !== a.replies) return b.replies - a.replies;
    return b.timestamp - a.timestamp;
  });

  return replies;
}
