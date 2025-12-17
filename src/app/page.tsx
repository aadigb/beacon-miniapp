"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  FormEvent,
} from "react";
import { useMiniApp } from "@neynar/react";
import sdk from "@farcaster/miniapp-sdk";

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
const ACCENT_DARK = "#4c1d95";
const ACCENT_LIGHT = "#e9d5ff";

export default function Page() {
  const { context } = useMiniApp();
  const [mounted, setMounted] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const [mode, setMode] = useState<"holder" | "dev">("holder");

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [questionText, setQuestionText] = useState("");

  // Dev form
  const [devTokenSymbol, setDevTokenSymbol] = useState("$TEST");
  const [devTokenAddress, setDevTokenAddress] = useState("");
  const [devChain, setDevChain] = useState("base-mainnet"); // simple text id
  const [devSaving, setDevSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // Tell Farcaster the miniapp is ready once context is available
  useEffect(() => {
    const init = async () => {
      if (context && !sdkReady) {
        try {
          await sdk.actions.ready();
          setSdkReady(true);
        } catch (e) {
          console.error("Error calling sdk.actions.ready()", e);
        }
      }
    };
    void init();
  }, [context, sdkReady]);

   const ctx = context as any;

  const wallet = ctx?.wallets?.[0]?.address?.toLowerCase();
  const user = ctx?.user;
  const isHolder = !!wallet; // v0: any connected wallet is treated as holder

  // --------- Data fetch helpers ---------

  const refreshProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      const list: ProjectSummary[] = data.projects ?? [];
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const refreshQuestions = async (projectId: string) => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(
        `/api/questions?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    void refreshProjects();
  }, [mounted]);

  useEffect(() => {
    if (!selectedProjectId) return;
    void refreshQuestions(selectedProjectId);
  }, [selectedProjectId]);

  // --------- Dev: enable Q&A on a token ---------

  const handleEnableForToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet || !user) {
      alert("Connect a wallet in Farcaster to enable Beacon for a token.");
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to enable token");
      }
      const data = await res.json();
      const project: ProjectSummary = data.project;

      await refreshProjects();
      setSelectedProjectId(project.id);
      setMode("holder");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to enable token");
    } finally {
      setDevSaving(false);
    }
  };

  // --------- Holder: submit question / upvote ---------

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

  // --------- Layout styles (black + purple) ---------

  const outerStyle: CSSProperties = {
    minHeight: "100vh",
    background: "#000000",
    color: "#f5f5f7",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 16,
    boxSizing: "border-box",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
  };

  const cardStyle: CSSProperties = {
    width: "100%",
    maxWidth: 420,
    background: "rgba(8,8,16,0.96)",
    borderRadius: 24,
    border: "1px solid #2b2938",
    boxShadow: "0 22px 60px rgba(0,0,0,0.85)",
    padding: 16,
    boxSizing: "border-box",
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  };

  const tokenLabelStyle: CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: "#a1a1c0",
  };

  const tokenNameStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
  };

  const userPillStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(18,18,30,0.96)",
    border: "1px solid #34324a",
    fontSize: 11,
  };

  const modeRowStyle: CSSProperties = {
    display: "flex",
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
    fontSize: 12,
  };

  const modeTabBase: CSSProperties = {
    padding: "6px 13px",
    borderRadius: 999,
    border: "1px solid #292637",
    background: "rgba(14,13,24,0.9)",
    color: "#777492",
    cursor: "pointer",
  };

  const modeTabActive: CSSProperties = {
    ...modeTabBase,
    border: `1px solid ${ACCENT}`,
    background: `radial-gradient(circle at top, ${ACCENT} 0, ${ACCENT_DARK} 55%, #05020a 100%)`,
    color: "#f9f5ff",
    fontWeight: 600,
  };

  const statRowStyle: CSSProperties = {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    fontSize: 11,
  };

  const statCard: CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid #2d2a3c",
    background: "rgba(14,13,24,0.96)",
    boxSizing: "border-box",
  };

  const statLabelStyle: CSSProperties = {
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#8f8cab",
    marginBottom: 3,
  };

  const statValueStyle: CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 2,
  };

  const statSubStyle: CSSProperties = {
    color: "#7f7c98",
    lineHeight: 1.3,
  };

  const selectStyle: CSSProperties = {
    width: "100%",
    borderRadius: 999,
    border: "1px solid #333149",
    background: "#11101b",
    color: "#f5f5f7",
    padding: "6px 12px",
    fontSize: 12,
    marginBottom: 8,
  };

  const composerCard: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 18,
    border: "1px solid #2d2a3c",
    background: "rgba(10,10,18,0.96)",
    marginBottom: 14,
    boxSizing: "border-box",
  };

  const textareaStyle: CSSProperties = {
    width: "100%",
    minHeight: 70,
    borderRadius: 12,
    border: "1px solid #333149",
    padding: 8,
    boxSizing: "border-box",
    fontSize: 13,
    background: "#11101b",
    color: "#f5f5f7",
    resize: "vertical",
  };

  const composerFooter: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  };

  const submitButtonStyle: CSSProperties = {
    padding: "7px 16px",
    borderRadius: 999,
    border: "none",
    background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_LIGHT} 60%, #ffffff 100%)`,
    color: "#050509",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const questionsHeaderStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
    fontSize: 12,
  };

  const questionsListStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  const questionCardStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid #262437",
    background: "rgba(14,13,24,0.98)",
    boxSizing: "border-box",
  };

  const voteButtonStyle: CSSProperties = {
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid #36324a",
    background: "#141321",
    color: "#f4f4ff",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const voteButtonActiveStyle: CSSProperties = {
    ...voteButtonStyle,
    borderColor: ACCENT,
    background: "rgba(168,85,247,0.18)",
    color: ACCENT_LIGHT,
  };

  // ---------- RENDER ----------

  if (!mounted || !context || !sdkReady) {
    return (
      <div style={outerStyle}>
        <div style={cardStyle}>
          <div
            style={{
              background: "#101016",
              borderRadius: 24,
              border: "1px solid #2b2938",
              padding: 16,
              fontSize: 13,
            }}
          >
            Loading Beacon…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={rowStyle}>
          <div>
            <div style={tokenLabelStyle}>Beacon</div>
            <div style={tokenNameStyle}>Token Q&amp;A</div>
          </div>
          <div style={userPillStyle}>
            <span style={{ fontWeight: 500 }}>@{user?.username}</span>
            <span style={{ opacity: 0.7 }}>FID {user?.fid}</span>
          </div>
        </div>

        {/* Mode toggle: holders vs devs */}
        <div style={modeRowStyle}>
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
            {/* Holder view */}

            {/* Stats row */}
            <div style={statRowStyle}>
              <div style={statCard}>
                <div style={statLabelStyle}>Holder status</div>
                <div style={statValueStyle}>
                  {isHolder ? "Holder ✅" : "Not a holder ❌"}
                </div>
                <div style={statSubStyle}>
                  Only holders can submit and upvote questions.
                </div>
              </div>
              <div style={{ ...statCard, textAlign: "right" }}>
                <div style={statLabelStyle}>Available tokens</div>
                <div style={statValueStyle}>
                  {projectsLoading ? "Loading…" : projects.length || "None"}
                </div>
                <div style={statSubStyle}>
                  These tokens have Beacon Q&amp;A enabled.
                </div>
              </div>
            </div>

            {/* Token dropdown */}
            <div style={{ marginBottom: 10 }}>
              <select
                style={selectStyle}
                value={selectedProjectId ?? ""}
                onChange={(e) =>
                  setSelectedProjectId(e.target.value || null)
                }
              >
                {projects.length === 0 && (
                  <option value="">No tokens enabled yet</option>
                )}
                {projects.length > 0 && !selectedProjectId && (
                  <option value="">Select a token to view questions</option>
                )}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.tokenSymbol} • {p.tokenAddress.slice(0, 6)}…
                    {p.tokenAddress.slice(-4)} • {p.totalQuestions} q
                  </option>
                ))}
              </select>
            </div>

            {/* Question composer */}
            <div style={composerCard}>
              <textarea
                style={textareaStyle}
                placeholder={
                  isHolder
                    ? "Ask the devs about roadmap, tokenomics, or launches…"
                    : "Connect a wallet in Farcaster to ask a question."
                }
                disabled={!isHolder || !selectedProjectId}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
              <div style={composerFooter}>
                <span
                  style={{
                    fontSize: 11,
                    color: "#8a87a6",
                    flex: 1,
                    lineHeight: 1.3,
                  }}
                >
                  Questions are scoped per token. Devs can see and answer the
                  highest-voted ones.
                </span>
                <button
                  style={{
                    ...submitButtonStyle,
                    opacity:
                      !isHolder ||
                      !selectedProjectId ||
                      !questionText.trim()
                        ? 0.4
                        : 1,
                    cursor:
                      !isHolder ||
                      !selectedProjectId ||
                      !questionText.trim()
                        ? "default"
                        : "pointer",
                  }}
                  disabled={
                    !isHolder ||
                    !selectedProjectId ||
                    !questionText.trim()
                  }
                  onClick={handleSubmitQuestion}
                >
                  Submit question
                </button>
              </div>
            </div>

            {/* Questions list */}
            <div style={questionsHeaderStyle}>
              <span style={{ fontWeight: 600 }}>Top questions</span>
              <span style={{ fontSize: 11, color: "#8f8cab" }}>
                {questionsLoading ? "Loading…" : `${questions.length} total`}
              </span>
            </div>

            <div style={questionsListStyle}>
              {!questionsLoading && questions.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#8a87a6",
                    padding: "8px 0",
                  }}
                >
                  No questions yet for this token. Be the first to ask something
                  meaningful.
                </div>
              )}

              {questions.map((q) => {
                const voted = wallet ? q.voters.includes(wallet) : false;
                return (
                  <div key={q.id} style={questionCardStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13 }}>{q.text}</p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          color: "#8581a0",
                        }}
                      >
                        @{q.authorUsername || "anon"}
                      </p>
                    </div>
                    <button
                      style={voted ? voteButtonActiveStyle : voteButtonStyle}
                      onClick={() => handleUpvote(q.id)}
                      disabled={!wallet || voted}
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
            {/* Dev view */}

            <div style={statRowStyle}>
              <div style={statCard}>
                <div style={statLabelStyle}>Your wallet</div>
                <div style={statValueStyle}>
                  {wallet
                    ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
                    : "Not connected"}
                </div>
                <div style={statSubStyle}>
                  This wallet will be treated as the token&apos;s admin for
                  Beacon.
                </div>
              </div>
              <div style={{ ...statCard, textAlign: "right" }}>
                <div style={statLabelStyle}>Enabled tokens</div>
                <div style={statValueStyle}>{projects.length}</div>
                <div style={statSubStyle}>
                  You can enable multiple tokens with this wallet.
                </div>
              </div>
            </div>

            <form onSubmit={handleEnableForToken} style={composerCard}>
              <div
                style={{
                  fontSize: 12,
                  marginBottom: 8,
                  color: "#cbc7ff",
                }}
              >
                Enable Beacon Q&amp;A on a token you admin. Holders will be able
                to submit and upvote questions.
              </div>

              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Token symbol
                </label>
                <input
                  value={devTokenSymbol}
                  onChange={(e) => setDevTokenSymbol(e.target.value)}
                  style={{
                    ...textareaStyle,
                    minHeight: 0,
                    height: 30,
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Token contract address
                </label>
                <input
                  value={devTokenAddress}
                  onChange={(e) => setDevTokenAddress(e.target.value)}
                  placeholder="0x…"
                  style={{
                    ...textareaStyle,
                    minHeight: 0,
                    height: 30,
                  }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Chain (label only)
                </label>
                <input
                  value={devChain}
                  onChange={(e) => setDevChain(e.target.value)}
                  placeholder="base-mainnet"
                  style={{
                    ...textareaStyle,
                    minHeight: 0,
                    height: 30,
                  }}
                />
              </div>

              <div style={composerFooter}>
                <span
                  style={{
                    fontSize: 11,
                    color: "#8a87a6",
                    flex: 1,
                    lineHeight: 1.3,
                  }}
                >
                  v0: we just record that this wallet enabled Beacon for the
                  token. Later we can add on-chain admin checks and metrics.
                </span>
                <button
                  type="submit"
                  style={{
                    ...submitButtonStyle,
                    opacity: !wallet || devSaving ? 0.4 : 1,
                    cursor: !wallet || devSaving ? "default" : "pointer",
                  }}
                  disabled={!wallet || devSaving}
                >
                  {devSaving ? "Saving…" : "Enable Q&A"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
