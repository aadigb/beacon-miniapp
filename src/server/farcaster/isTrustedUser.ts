const NEYNAR_API = "https://api.neynar.com/v2/farcaster/user/bulk";

export async function isTrustedUser(fid: number): Promise<boolean> {
  try {
    if (!process.env.NEYNAR_API_KEY) {
      throw new Error("Missing NEYNAR_API_KEY");
    }

    const res = await fetch(NEYNAR_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": process.env.NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        fids: [fid],
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const user = data.users?.[0];

    if (!user) return false;

    // Neynar score location (defensive)
    const score =
      user.score ??
      user.viewer_context?.score ??
      0;

    return score >= 0.8;
  } catch (err) {
    console.error("Neynar trust check failed:", err);
    return false;
  }
}
