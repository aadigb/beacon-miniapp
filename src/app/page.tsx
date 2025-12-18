"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  FormEvent,
  useCallback,
  useMemo,
} from "react";
import { useMiniApp } from "@neynar/react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";

type ProjectSummary = {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
  createdAt: number;
  totalQuestions: number;
};

type Question = {
  id: string;
  projectId: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  walletAddress: string;
  votes: number;
  voters: string[];
  createdAt: number;
};

const ACCENT = "#a855f7";
const ACCENT_SOFT = "#c4a6ff";

export default function Page() {
  const mini = useMiniApp() as any;
  const context = mini?.context;
  const isLoading = mini?.isLoading;
  const isSDKLoaded = mini?.isSDKLoaded ?? true;

  const [mounted, setMounted] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const [mode, setMode] = useState<"holder" | "dev">("holder");

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [questionText, setQuestionText] = useState("");

  // dev form
  const [devTokenSymbol, setDevTokenSymbol] = useState("$TEST");
  const [devTokenAddress, setDevTokenAddress] = useState("");
  const [devChain, setDevChain] = useState("base-mainnet");
  const [devSaving, setDevSaving] = useState(false);

  // holder gating
  const [holderLoading, setHolderLoading] = useState(false);
  const [isOnchainHolder, setIsOnchainHolder] = useState(false);

  useEffect(() => setMounted(true), []);

  // Wagmi (Farcaster connector)
  const { address, isConnected } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();

  const wallet = address?.toLowerCase().trim();
  const user = context?.user;

  const handleConnectWallet = useCallback(() => {
    if (isConnected) return;
    const connector = connectors?.[0];
    if (!connector) {
      alert("No Farcaster wallet connector found in wagmi config.");
      return;
    }
    connect({ connector });
  }, [connect, connectors, isConnected]);

  // ready
  useEffect(() => {
    if (!isSDKLoaded || sdkReady || !context) return;
    (async () => {
      try {
        await sdk.actions.ready();
        setSdkReady(true);
      } catch (e) {
        console.error("sdk.actions.ready failed", e);
      }
    })();
  }, [context, isSDKLoaded, sdkReady]);

  const selectedProject = useMemo(() => {
    return selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) ?? null
      : null;
  }, [projects, selectedProjectId]);

  const isAdmin = useMemo(() => {
    if (!wallet || !selectedProject) return false;
    return selectedProject.adminWallet.toLowerCase() === wallet.toLowerCase();
  }, [selectedProject, wallet]);

  const canPost = isConnected && !!wallet && (isOnchainHolder || isAdmin);

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      const list: ProjectSummary[] = Array.isArray(data.projects) ? data.projects : [];
      setProjects(list);
      setSelectedProjectId((cur) => cur ?? (list[0]?.id ?? null));
    } catch (err) {
      console.error(err);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const refreshQuestions = useCallback(async (projectId: string) => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/questions?projectId=${encodeURIComponent(projectId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      const list: Question[] = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !sdkReady) return;
    void refreshProjects();
  }, [mounted, sdkReady, refreshProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    void refreshQuestions(selectedProjectId);
  }, [selectedProjectId, refreshQuestions]);

  // Onchain holder check when token+wallet changes
  useEffect(() => {
    const run = async () => {
      setIsOnchainHolder(false);
      if (!wallet || !selectedProject?.tokenAddress || !isConnected) return;

      setHolderLoading(true);
      try {
        const res = await fetch(
          `/api/holder?tokenAddress=${encodeURIComponent(
            selectedProject.tokenAddress
          )}&walletAddress=${encodeURIComponent(wallet)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok) setIsOnchainHolder(!!data.isHolder);
      } catch (e) {
        console.error(e);
      } finally {
        setHolderLoading(false);
      }
    };
    void run();
  }, [wallet, selectedProject?.tokenAddress, isConnected]);

  const handleEnableForToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet || !user || !isConnected) {
      alert("Connect your wallet first.");
      return;
    }
    if (!devTokenAddress.trim()) {
      alert("Enter a token contract address.");
      return;
    }

    setDevSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenSymbol: devTokenSymbol.trim() || "$TOKEN",
          tokenAddress: devTokenAddress.trim(),
          chain: devChain.trim() || "base-mainnet",
          adminWallet: wallet,
          adminFid: user.fid,
          adminUsername: user.username,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to enable token");

      await refreshProjects();
      if (data?.project?.id) setSelectedProjectId(data.project.id);
      setMode("holder");
      setDevTokenAddress("");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to enable token");
    } finally {
      setDevSaving(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!canPost || !wallet || !user || !selectedProjectId) return;
    const text = questionText.trim();
    if (!text) return;

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          text,
          authorFid: user.fid,
          authorUsername: user.username,
          walletAddress: wallet,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit question");
      setQuestionText("");
      await refreshQuestions(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvote = async (id: string) => {
    if (!canPost || !wallet) return;
    try {
      const res = await fetch("/api/questions/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, walletAddress: wallet }),
      });
      if (!res.ok) throw new Error("Failed to upvote");
      if (selectedProjectId) await refreshQuestions(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- styles ----------------
  const outerStyle: CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #120926 0, #05040b 45%, #030208 100%)",
    color: "#f8f7ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 16,
    boxSizing: "border-box",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
  };

  const shellStyle: CSSProperties = {
    width: "100%",
    maxWidth: 480,
    borderRadius: 28,
    border: "1px solid rgba(135,118,217,0.24)",
    background:
      "linear-gradient(145deg, rgba(11,9,27,0.98) 0%, rgba(3,3,12,0.98) 100%)",
    boxShadow: "0 26px 70px rgba(0,0,0,0.85)",
    padding: 16,
    boxSizing: "border-box",
  };

  const headerRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  };

  const brandStyle: CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#a2a0c7",
  };

  const titleStyle: CSSProperties = {
    fontSize: 20,
    fontWeight: 650,
    marginTop: 4,
  };

  const pill: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "7px 11px",
    borderRadius: 999,
    border: "1px solid rgba(124,113,199,0.45)",
    background:
      "radial-gradient(circle at top, #1d1638 0, #0b0918 60%, #05040d 100%)",
    fontSize: 11,
    minWidth: 140,
  };

  const btn: CSSProperties = {
    marginTop: 6,
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(99,91,182,0.9)",
    background: "rgba(10,9,27,0.98)",
    color: "#f4f4ff",
    fontSize: 12,
    cursor: "pointer",
  };

  const tabs: CSSProperties = { display: "flex", gap: 8, marginBottom: 12 };

  const tabBase: CSSProperties = {
    padding: "7px 15px",
    borderRadius: 999,
    border: "1px solid rgba(72,67,121,0.8)",
    background: "rgba(9,8,25,0.9)",
    color: "#908cb0",
    cursor: "pointer",
    fontSize: 12,
  };

  const tabActive: CSSProperties = {
    ...tabBase,
    border: `1px solid ${ACCENT}`,
    background:
      "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(88,28,135,0.65))",
    color: "#f7f3ff",
    fontWeight: 600,
  };

  const card: CSSProperties = {
    borderRadius: 18,
    padding: 12,
    border: "1px solid rgba(63,57,114,0.9)",
    background: "rgba(7,6,20,0.98)",
    marginBottom: 12,
  };

  const input: CSSProperties = {
    width: "100%",
    height: 34,
    borderRadius: 12,
    border: "1px solid rgba(69,61,131,0.9)",
    padding: "0 10px",
    boxSizing: "border-box",
    fontSize: 13,
    background: "#090818",
    color: "#f5f5ff",
  };

  const textarea: CSSProperties = {
    width: "100%",
    minHeight: 70,
    borderRadius: 12,
    border: "1px solid rgba(69,61,131,0.9)",
    padding: 10,
    boxSizing: "border-box",
    fontSize: 13,
    background: "#090818",
    color: "#f5f5ff",
    resize: "vertical",
  };

  const primary: CSSProperties = {
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background:
      "linear-gradient(135deg, #fdfcff 0%, #e3d3ff 40%, #a855f7 100%)",
    color: "#14092c",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  if (!mounted || isLoading || !context || !sdkReady) {
    return (
      <div style={outerStyle}>
        <div style={shellStyle}>
          <div style={card}>Booting Beacon…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <div style={shellStyle}>
        <div style={headerRow}>
          <div>
            <div style={brandStyle}>BEACON</div>
            <div style={titleStyle}>Token Q&amp;A</div>
          </div>

          <div style={pill}>
            <span style={{ fontWeight: 600 }}>@{user?.username ?? "anon"}</span>
            <span style={{ opacity: 0.7 }}>FID {user?.fid ?? "—"}</span>

            {!isConnected ? (
              <button
                type="button"
                style={{ ...btn, opacity: connectStatus === "pending" ? 0.6 : 1 }}
                onClick={handleConnectWallet}
                disabled={connectStatus === "pending"}
              >
                {connectStatus === "pending" ? "Connecting…" : "Connect wallet"}
              </button>
            ) : (
              <div style={{ marginTop: 6, fontSize: 11, color: ACCENT_SOFT }}>
                {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connected"}
              </div>
            )}
          </div>
        </div>

        <div style={tabs}>
          <button
            type="button"
            style={mode === "holder" ? tabActive : tabBase}
            onClick={() => setMode("holder")}
          >
            For tokenholders
          </button>
          <button
            type="button"
            style={mode === "dev" ? tabActive : tabBase}
            onClick={() => setMode("dev")}
          >
            For devs
          </button>
        </div>

        {mode === "dev" ? (
          <form onSubmit={handleEnableForToken} style={card}>
            <div style={{ marginBottom: 10, color: "#cbc7ff", fontSize: 12 }}>
              Enable Q&amp;A for a token (Base).
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>
                Token symbol
              </div>
              <input style={input} value={devTokenSymbol} onChange={(e) => setDevTokenSymbol(e.target.value)} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>
                Token contract
              </div>
              <input
                style={input}
                value={devTokenAddress}
                onChange={(e) => setDevTokenAddress(e.target.value)}
                placeholder="0x…"
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>
                Chain
              </div>
              <input style={input} value={devChain} onChange={(e) => setDevChain(e.target.value)} />
            </div>

            <button
              type="submit"
              style={{ ...primary, opacity: !wallet || devSaving ? 0.5 : 1 }}
              disabled={!wallet || devSaving}
            >
              {devSaving ? "Enabling…" : "Enable Q&A"}
            </button>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.75 }}>
              Enabled tokens persist via KV (so they won’t disappear after deploy).
            </div>
          </form>
        ) : (
          <>
            <div style={card}>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Token:{" "}
                <span style={{ color: ACCENT_SOFT, fontWeight: 700 }}>
                  {selectedProject ? selectedProject.tokenSymbol : "None"}
                </span>
              </div>

              <div style={{ marginTop: 8, fontSize: 12 }}>
                Status:{" "}
                <span style={{ color: ACCENT_SOFT, fontWeight: 700 }}>
                  {holderLoading
                    ? "Checking…"
                    : canPost
                    ? "Holder ✓"
                    : isConnected
                    ? "Not a holder"
                    : "Connect wallet"}
                </span>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Ask a question
              </div>

              <textarea
                style={textarea}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={!canPost || !selectedProjectId}
                placeholder={
                  canPost
                    ? "Ask something specific…"
                    : "Connect wallet + hold the token to post."
                }
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    ...primary,
                    opacity: !canPost || !selectedProjectId || !questionText.trim() ? 0.4 : 1,
                    cursor:
                      !canPost || !selectedProjectId || !questionText.trim()
                        ? "default"
                        : "pointer",
                  }}
                  disabled={!canPost || !selectedProjectId || !questionText.trim()}
                  onClick={handleSubmitQuestion}
                >
                  Submit
                </button>
              </div>
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Top questions</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>
                  {questionsLoading ? "Loading…" : `${questions.length}`}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {questions.map((q) => {
                  const voted = wallet ? q.voters.includes(wallet) : false;
                  return (
                    <div
                      key={q.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(63,57,114,0.9)",
                        padding: 10,
                        background:
                          "linear-gradient(135deg, rgba(10,9,27,0.98), rgba(3,2,12,0.98))",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13 }}>{q.text}</div>
                        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                          @{q.authorUsername || "anon"}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canPost || voted}
                        onClick={() => handleUpvote(q.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: voted ? `1px solid ${ACCENT}` : "1px solid rgba(99,91,182,0.9)",
                          background: voted ? "rgba(168,85,247,0.17)" : "#0b0a1b",
                          color: voted ? ACCENT_SOFT : "#f4f4ff",
                          fontSize: 12,
                          cursor: !canPost || voted ? "default" : "pointer",
                          opacity: !canPost ? 0.5 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ▲ {q.votes}
                      </button>
                    </div>
                  );
                })}

                {!questionsLoading && questions.length === 0 && (
                  <div style={{ fontSize: 12, opacity: 0.75, paddingTop: 6 }}>
                    No questions yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* token picker */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            Tokens
          </div>
          {projectsLoading ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>Loading…</div>
          ) : projects.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              None yet. Enable one in “For devs”.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    minWidth: 140,
                    borderRadius: 16,
                    border:
                      p.id === selectedProjectId
                        ? `1px solid ${ACCENT}`
                        : "1px solid rgba(63,57,114,0.9)",
                    background: "rgba(9,8,25,0.9)",
                    color: "#f8f7ff",
                    padding: 10,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{p.tokenSymbol}</div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>
                    {p.tokenAddress.slice(0, 6)}…{p.tokenAddress.slice(-4)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}