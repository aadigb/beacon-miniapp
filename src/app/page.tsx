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
  // Neynar miniapp context (typed loosely to avoid TS mismatch across versions)
  const mini = useMiniApp() as any;
  const context = mini?.context;
  const isLoading = mini?.isLoading;
  const isSDKLoaded = mini?.isSDKLoaded ?? true;

  const [mounted, setMounted] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // holder / dev mode
  const [mode, setMode] = useState<"holder" | "dev">("holder");

  // data
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [questionText, setQuestionText] = useState("");

  // dev form
  const [devTokenSymbol, setDevTokenSymbol] = useState("$TEST");
  const [devTokenAddress, setDevTokenAddress] = useState("");
  const [devChain, setDevChain] = useState("base-mainnet");
  const [devSaving, setDevSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // ---- Wagmi wallet (Farcaster miniapp connector) ----
  const { address, isConnected } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();

  const wallet = address?.toLowerCase().trim();
  const user = context?.user;
  const isHolder = isConnected && !!wallet; // v0 gate: connected wallet == holder

  const handleConnectWallet = useCallback(() => {
    if (isConnected) return;
    const connector = connectors?.[0];
    if (!connector) {
      alert(
        "No Farcaster wallet connector found. Make sure your wagmi config includes the Farcaster Mini App connector."
      );
      return;
    }
    connect({ connector });
  }, [connect, connectors, isConnected]);

  // Mark ready for Farcaster host
  useEffect(() => {
    if (!isSDKLoaded || sdkReady || !context) return;

    (async () => {
      try {
        await sdk.actions.ready();
        setSdkReady(true);
      } catch (e) {
        console.error("Error calling sdk.actions.ready()", e);
      }
    })();
  }, [context, isSDKLoaded, sdkReady]);

  const selectedProject = useMemo(() => {
    return selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) ?? null
      : null;
  }, [projects, selectedProjectId]);

  const myProjects = useMemo(() => {
    if (!wallet) return [];
    return projects.filter(
      (p) => p.adminWallet.toLowerCase() === wallet.toLowerCase()
    );
  }, [projects, wallet]);

  // ------------ data helpers ------------

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      const list: ProjectSummary[] = Array.isArray(data.projects)
        ? data.projects
        : [];
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
      const res = await fetch(
        `/api/questions?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      );
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

  // initial projects (after mount + sdkReady)
  useEffect(() => {
    if (!mounted || !sdkReady) return;
    void refreshProjects();
  }, [mounted, sdkReady, refreshProjects]);

  // questions when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    void refreshQuestions(selectedProjectId);
  }, [selectedProjectId, refreshQuestions]);

  // ------------ dev: enable token ------------

  const handleEnableForToken = async (e: FormEvent) => {
    e.preventDefault();

    if (!wallet || !user || !isConnected) {
      alert("Connect your Farcaster wallet first.");
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

      const project: ProjectSummary | undefined = data.project;
      await refreshProjects();
      if (project?.id) setSelectedProjectId(project.id);
      setMode("holder");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to enable token");
    } finally {
      setDevSaving(false);
    }
  };

  // ------------ holder: submit / upvote ------------

  const handleSubmitQuestion = async () => {
    if (!isHolder || !wallet || !user || !selectedProjectId) return;

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
    if (!wallet || !selectedProjectId) return;
    try {
      const res = await fetch("/api/questions/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, walletAddress: wallet }),
      });
      if (!res.ok) throw new Error("Failed to upvote");
      await refreshQuestions(selectedProjectId);
    } catch (err) {
      console.error(err);
    }
  };

  // ------------ styles (dark / purple, Noice-ish) ------------

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
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.9)",
    padding: 16,
    boxSizing: "border-box",
  };

  const headerRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
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

  const userPill: CSSProperties = {
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

  const connectButton: CSSProperties = {
    marginTop: 6,
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid rgba(99,91,182,0.9)",
    background: "rgba(10,9,27,0.98)",
    color: "#f4f4ff",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const modeTabsRow: CSSProperties = {
    display: "flex",
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
    fontSize: 12,
  };

  const modeTabBase: CSSProperties = {
    padding: "7px 15px",
    borderRadius: 999,
    border: "1px solid rgba(72,67,121,0.8)",
    background: "rgba(9,8,25,0.9)",
    color: "#908cb0",
    cursor: "pointer",
  };

  const modeTabActive: CSSProperties = {
    ...modeTabBase,
    border: `1px solid ${ACCENT}`,
    background:
      "linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(88,28,135,0.65) 50%, rgba(4,0,12,0.98) 100%)",
    color: "#f7f3ff",
    fontWeight: 600,
  };

  const heroCard: CSSProperties = {
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    background:
      "linear-gradient(145deg, rgba(60,32,120,0.46) 0%, rgba(23,13,55,0.92) 35%, #080616 90%)",
    border: "1px solid rgba(178,155,255,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  const heroTopRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  };

  const tokenBadge: CSSProperties = {
    padding: "4px 9px",
    borderRadius: 999,
    border: "1px solid rgba(221,214,254,0.3)",
    fontSize: 11,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(15,7,40,0.95)",
  };

  const miniatureDot: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: ACCENT,
    boxShadow: "0 0 0 4px rgba(168,85,247,0.35)",
  };

  const heroStatRow: CSSProperties = {
    display: "flex",
    gap: 12,
    fontSize: 11,
    color: "#e5ddff",
  };

  const heroStatBlock: CSSProperties = {
    flex: 1,
    padding: "6px 9px",
    borderRadius: 16,
    background: "rgba(8,5,26,0.88)",
    border: "1px solid rgba(124,113,199,0.38)",
  };

  const heroLabel: CSSProperties = {
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: "#b7b3e3",
    fontSize: 10,
    marginBottom: 2,
  };

  const heroValue: CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
  };

  const heroSub: CSSProperties = {
    opacity: 0.8,
    marginTop: 1,
  };

  const tokenRail: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    overflowX: "auto",
    gap: 8,
    paddingBottom: 6,
    marginBottom: 10,
  };

  const tokenCardBase: CSSProperties = {
    minWidth: 140,
    borderRadius: 18,
    border: "1px solid rgba(63,57,114,0.9)",
    background:
      "linear-gradient(145deg, rgba(13,11,32,0.96), rgba(5,4,18,0.98))",
    padding: 10,
    fontSize: 11,
    cursor: "pointer",
    color: "#f8f7ff",
  };

  const tokenCardActive: CSSProperties = {
    ...tokenCardBase,
    border: `1px solid ${ACCENT}`,
    boxShadow: "0 0 0 1px rgba(168,85,247,0.55), 0 18px 40px rgba(0,0,0,0.7)",
  };

  const sectionTitleRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
    marginTop: 4,
    fontSize: 12,
  };

  const composerCard: CSSProperties = {
    padding: 10,
    borderRadius: 18,
    border: "1px solid rgba(63,57,114,0.9)",
    background: "rgba(7,6,20,0.98)",
    marginBottom: 12,
  };

  const textareaStyle: CSSProperties = {
    width: "100%",
    minHeight: 70,
    borderRadius: 12,
    border: "1px solid rgba(69,61,131,0.9)",
    padding: 8,
    boxSizing: "border-box",
    fontSize: 13,
    background: "#090818",
    color: "#f5f5ff",
    resize: "vertical",
  };

  const composerFooter: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  };

  const submitButton: CSSProperties = {
    padding: "7px 16px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #fdfcff 0%, #e3d3ff 40%, #a855f7 100%)",
    color: "#14092c",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const questionsList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  const questionCard: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(63,57,114,0.9)",
    background: "linear-gradient(135deg, rgba(10,9,27,0.98), rgba(3,2,12,0.98))",
  };

  const voteButton: CSSProperties = {
    padding: "5px 11px",
    borderRadius: 999,
    border: "1px solid rgba(99,91,182,0.9)",
    background: "#0b0a1b",
    color: "#f4f4ff",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const voteButtonActive: CSSProperties = {
    ...voteButton,
    borderColor: ACCENT,
    background: "rgba(168,85,247,0.17)",
    color: ACCENT_SOFT,
  };

  // ------------ loading gate ------------

  if (!mounted || isLoading || !context || !sdkReady) {
    return (
      <div style={outerStyle}>
        <div style={shellStyle}>
          <div
            style={{
              ...heroCard,
              border: "1px solid rgba(63,57,114,0.9)",
              background: "linear-gradient(135deg, #130d2c, #070616)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              Booting <strong>Beacon</strong> mini-app…
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------------ render ------------

  return (
    <div style={outerStyle}>
      <div style={shellStyle}>
        {/* header */}
        <div style={headerRow}>
          <div>
            <div style={brandStyle}>BEACON</div>
            <div style={titleStyle}>Token Q&amp;A</div>
          </div>

          <div style={userPill}>
            <span style={{ fontWeight: 500 }}>@{user?.username ?? "anon"}</span>
            <span style={{ opacity: 0.7 }}>FID {user?.fid ?? "—"}</span>

            {!isConnected ? (
              <button
                style={{
                  ...connectButton,
                  opacity: connectStatus === "pending" ? 0.6 : 1,
                  cursor: connectStatus === "pending" ? "default" : "pointer",
                }}
                onClick={handleConnectWallet}
                disabled={connectStatus === "pending"}
                type="button"
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

        {/* mode tabs */}
        <div style={modeTabsRow}>
          <button
            style={mode === "holder" ? modeTabActive : modeTabBase}
            onClick={() => setMode("holder")}
          >
            For tokenholders
          </button>
          <button
            style={mode === "dev" ? modeTabActive : modeTabBase}
            onClick={() => setMode("dev")}
          >
            For devs
          </button>
        </div>

        {mode === "holder" ? (
          <>
            {/* hero for selected token */}
            <div style={heroCard}>
              <div style={heroTopRow}>
                <div>
                  <div style={tokenBadge}>
                    <div style={miniatureDot} />
                    <span>
                      {selectedProject ? selectedProject.tokenSymbol : "No token selected"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: "#e5defe" }}>
                    Ask questions and upvote what you want teams to answer next.
                  </div>
                </div>

                <div style={{ textAlign: "right", fontSize: 11 }}>
                  <div style={{ color: ACCENT_SOFT, fontWeight: 600 }}>
                    {isHolder ? "Holder ✓" : "View-only"}
                  </div>
                  <div style={{ opacity: 0.8 }}>
                    Wallet{" "}
                    {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "not connected"}
                  </div>
                </div>
              </div>

              <div style={heroStatRow}>
                <div style={heroStatBlock}>
                  <div style={heroLabel}>Holder status</div>
                  <div style={heroValue}>
                    {isHolder ? "Can submit & upvote" : "View-only"}
                  </div>
                  <div style={heroSub}>
                    Use the “Connect wallet” button to enable posting/upvoting.
                  </div>
                </div>

                <div style={heroStatBlock}>
                  <div style={heroLabel}>Available tokens</div>
                  <div style={heroValue}>
                    {projectsLoading ? "Loading…" : projects.length || "None"}
                  </div>
                  <div style={heroSub}>Tokens with Beacon enabled.</div>
                </div>
              </div>
            </div>

            {/* token rail */}
            <div style={sectionTitleRow}>
              <span style={{ fontWeight: 600 }}>Tokens</span>
              <span style={{ fontSize: 11, color: "#908cb5" }}>
                Tap a token to view its Q&amp;A
              </span>
            </div>

            <div style={tokenRail}>
              {projects.length === 0 && !projectsLoading && (
                <div style={{ fontSize: 11, color: "#8c87b1", padding: "4px 2px" }}>
                  No tokens yet. Devs can enable Beacon in the “For devs” tab.
                </div>
              )}

              {projects.map((p) => {
                const active = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    style={active ? tokenCardActive : tokenCardBase}
                    onClick={() => setSelectedProjectId(p.id)}
                    type="button"
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                      {p.tokenSymbol}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>
                      {p.tokenAddress.slice(0, 6)}…{p.tokenAddress.slice(-4)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: "#b7b3e7" }}>
                      {p.totalQuestions} questions
                    </div>
                  </button>
                );
              })}
            </div>

            {/* composer */}
            <div style={sectionTitleRow}>
              <span style={{ fontWeight: 600 }}>Ask a question</span>
              <span style={{ fontSize: 11, color: "#908cb5" }}>
                Devs see the highest-voted questions first
              </span>
            </div>

            <div style={composerCard}>
              <textarea
                style={textareaStyle}
                placeholder={
                  isHolder
                    ? "Ask about roadmap, token design, launches, or anything you want clarity on…"
                    : "Connect your wallet to ask a question."
                }
                disabled={!isHolder || !selectedProjectId}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />

              <div style={composerFooter}>
                <span style={{ fontSize: 11, color: "#8a87a6", flex: 1, lineHeight: 1.3 }}>
                  Questions are per-token. Avoid spam so devs actually answer.
                </span>

                <button
                  style={{
                    ...submitButton,
                    opacity: !isHolder || !selectedProjectId || !questionText.trim() ? 0.35 : 1,
                    cursor:
                      !isHolder || !selectedProjectId || !questionText.trim()
                        ? "default"
                        : "pointer",
                  }}
                  disabled={!isHolder || !selectedProjectId || !questionText.trim()}
                  onClick={handleSubmitQuestion}
                  type="button"
                >
                  Submit question
                </button>
              </div>
            </div>

            {/* questions */}
            <div style={sectionTitleRow}>
              <span style={{ fontWeight: 600 }}>Top questions</span>
              <span style={{ fontSize: 11, color: "#908cb5" }}>
                {questionsLoading ? "Loading…" : `${questions.length} total`}
              </span>
            </div>

            <div style={questionsList}>
              {!questionsLoading && questions.length === 0 && (
                <div style={{ fontSize: 12, color: "#8a87a6", padding: "8px 0" }}>
                  No questions yet for this token. Be the first to ask something useful.
                </div>
              )}

              {questions.map((q) => {
                const voted = wallet ? q.voters.includes(wallet) : false;
                return (
                  <div key={q.id} style={questionCard}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13 }}>{q.text}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#918db9" }}>
                        @{q.authorUsername || "anon"}
                      </p>
                    </div>

                    <button
                      style={voted ? voteButtonActive : voteButton}
                      onClick={() => handleUpvote(q.id)}
                      disabled={!wallet || voted}
                      type="button"
                    >
                      ▲ {q.votes}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* DEV VIEW */}
            <div style={heroCard}>
              <div style={heroTopRow}>
                <div>
                  <div style={heroLabel}>You are deploying as</div>
                  <div style={heroValue}>
                    {wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "No wallet connected"}
                  </div>
                  <div style={heroSub}>This wallet will be recorded as the token admin for Beacon.</div>
                </div>

                <div style={{ textAlign: "right", fontSize: 11 }}>
                  <div style={heroLabel}>Enabled tokens</div>
                  <div style={heroValue}>{myProjects.length}</div>
                  <div style={heroSub}>Use the same admin wallet when enabling new tokens.</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleEnableForToken} style={composerCard}>
              <div style={{ fontSize: 12, marginBottom: 8, color: "#cbc7ff" }}>
                Turn your token into a Q&amp;A funnel. Holders can submit &amp; upvote.
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Token symbol
                </label>
                <input
                  value={devTokenSymbol}
                  onChange={(e) => setDevTokenSymbol(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 0, height: 32 }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Token contract address
                </label>
                <input
                  value={devTokenAddress}
                  onChange={(e) => setDevTokenAddress(e.target.value)}
                  placeholder="0x…"
                  style={{ ...textareaStyle, minHeight: 0, height: 32 }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                  Chain (label only for now)
                </label>
                <input
                  value={devChain}
                  onChange={(e) => setDevChain(e.target.value)}
                  placeholder="base-mainnet"
                  style={{ ...textareaStyle, minHeight: 0, height: 32 }}
                />
              </div>

              <div style={composerFooter}>
                <span style={{ fontSize: 11, color: "#8a87a6", flex: 1, lineHeight: 1.3 }}>
                  v0: we record this wallet as admin. Next: add onchain admin checks + token balance gating.
                </span>

                <button
                  type="submit"
                  style={{
                    ...submitButton,
                    opacity: !wallet || devSaving ? 0.4 : 1,
                    cursor: !wallet || devSaving ? "default" : "pointer",
                  }}
                  disabled={!wallet || devSaving}
                >
                  {devSaving ? "Saving…" : "Enable Q&A"}
                </button>
              </div>
            </form>

            {/* list tokens you admin */}
            <div style={sectionTitleRow}>
              <span style={{ fontWeight: 600 }}>Your enabled tokens</span>
              <span style={{ fontSize: 11, color: "#908cb5" }}>
                Tap one to jump to holder view
              </span>
            </div>

            <div style={tokenRail}>
              {myProjects.length === 0 && (
                <div style={{ fontSize: 11, color: "#8c87b1", padding: "4px 2px" }}>
                  No tokens yet. Enable your first one above.
                </div>
              )}

              {myProjects.map((p) => (
                <button
                  key={p.id}
                  style={p.id === selectedProjectId ? tokenCardActive : tokenCardBase}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setMode("holder");
                  }}
                  type="button"
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{p.tokenSymbol}</div>
                  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.85 }}>
                    {p.tokenAddress.slice(0, 6)}…{p.tokenAddress.slice(-4)}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "#b7b3e7" }}>
                    {p.totalQuestions} questions
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
