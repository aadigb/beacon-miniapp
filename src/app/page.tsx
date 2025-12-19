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

/* ---------------- Types ---------------- */

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

/* ---------------- Constants ---------------- */

const ACCENT = "#a855f7";
const ACCENT_SOFT = "#c4a6ff";

/* ============================== */
/*            PAGE                */
/* ============================== */

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

  /* ---------------- Lifecycle ---------------- */

  useEffect(() => setMounted(true), []);

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

  /* ---------------- Wallet (Wagmi Mini App) ---------------- */

  const { address } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();

  const wallet = address?.toLowerCase() ?? null;
  const user = context?.user;

  const handleConnectWallet = () => {
    const connector = connectors?.[0];
    if (!connector) {
      console.warn("Miniapp connector not ready");
      return;
    }
    connect({ connector });
  };

  /* ---------------- Derived ---------------- */

  const selectedProject = useMemo(() => {
    return selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId) ?? null
      : null;
  }, [projects, selectedProjectId]);

  const isAdmin = useMemo(() => {
    if (!wallet || !selectedProject) return false;
    return selectedProject.adminWallet === wallet;
  }, [wallet, selectedProject]);

  const canPost = !!wallet && (isOnchainHolder || isAdmin);

  /* ---------------- Data ---------------- */

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      const list: ProjectSummary[] = Array.isArray(data.projects)
        ? data.projects
        : [];
      setProjects(list);
      setSelectedProjectId((cur) => cur ?? list[0]?.id ?? null);
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
      const data = await res.json();
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !sdkReady) return;
    refreshProjects();
  }, [mounted, sdkReady, refreshProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    refreshQuestions(selectedProjectId);
  }, [selectedProjectId, refreshQuestions]);

  /* ---------------- Holder Check ---------------- */

  useEffect(() => {
    if (!wallet || !selectedProject?.tokenAddress) return;

    const run = async () => {
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

    run();
  }, [wallet, selectedProject?.tokenAddress]);

  /* ---------------- Actions ---------------- */

  const handleEnableForToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet || !user || !devTokenAddress.trim()) {
      alert("Wallet not connected or token missing.");
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
          chain: devChain,
          adminWallet: wallet,
          adminFid: user.fid,
          adminUsername: user.username,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Enable token failed", data);
        alert(data.error || "Failed to enable token");
        return;
      }

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

  /* ---------------- Styles (UNCHANGED) ---------------- */

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

  const card: CSSProperties = {
    borderRadius: 18,
    padding: 12,
    border: "1px solid rgba(63,57,114,0.9)",
    background: "rgba(7,6,20,0.98)",
    marginBottom: 12,
  };

  /* ---------------- Loading ---------------- */

  if (!mounted || isLoading || !context || !sdkReady) {
    return (
      <div style={outerStyle}>
        <div style={shellStyle}>
          <div style={card}>Booting Beacon…</div>
        </div>
      </div>
    );
  }

  /* ============================== */
  /*            RENDER              */
  /* ============================== */

  return (
    <div style={outerStyle}>
      <div style={shellStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", color: "#a2a0c7" }}>
              BEACON
            </div>
            <div style={{ fontSize: 20, fontWeight: 650 }}>Token Q&amp;A</div>
          </div>

          <div>
            <div>@{user?.username ?? "anon"}</div>
            {!wallet ? (
              <button onClick={handleConnectWallet}>
                {connectStatus === "pending" ? "Connecting…" : "Connect wallet"}
              </button>
            ) : (
              <div>
                {wallet.slice(0, 6)}…{wallet.slice(-4)}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => setMode("holder")}>For tokenholders</button>
          <button onClick={() => setMode("dev")}>For devs</button>
        </div>

        {/* Content */}
        {mode === "dev" ? (
          <form onSubmit={handleEnableForToken} style={card}>
            <input
              value={devTokenSymbol}
              onChange={(e) => setDevTokenSymbol(e.target.value)}
            />
            <input
              value={devTokenAddress}
              onChange={(e) => setDevTokenAddress(e.target.value)}
              placeholder="0x…"
            />
            <button disabled={devSaving}>
              {devSaving ? "Enabling…" : "Enable Q&A"}
            </button>
          </form>
        ) : (
          <>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              disabled={!canPost}
            />
            <button onClick={handleSubmitQuestion} disabled={!canPost}>
              Submit
            </button>

            {questions.map((q) => (
              <div key={q.id} style={card}>
                <div>{q.text}</div>
                <button
                  disabled={!canPost || q.voters.includes(wallet ?? "")}
                  onClick={() => handleUpvote(q.id)}
                >
                  ▲ {q.votes}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );  
}
