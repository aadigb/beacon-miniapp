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
    sdk.actions.ready().then(() => setSdkReady(true)).catch(console.error);
  }, [context, isSDKLoaded, sdkReady]);

  /* ---------------- Wallet (Wagmi + Farcaster) ---------------- */

  const { address } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();

  const wallet = address?.toLowerCase() ?? null;
  const user = context?.user;

  const handleConnectWallet = () => {
    const connector = connectors?.[0];
    if (!connector) return;
    connect({ connector });
  };

  /* ---------------- Derived State ---------------- */

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const isAdmin = useMemo(() => {
    if (!wallet || !selectedProject) return false;
    return selectedProject.adminWallet === wallet;
  }, [wallet, selectedProject]);

  const canPost = !!wallet && (isOnchainHolder || isAdmin);

  /* ---------------- Data Fetching ---------------- */

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects ?? []);
      setSelectedProjectId((cur) => cur ?? data.projects?.[0]?.id ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const refreshQuestions = useCallback(async (projectId: string) => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/questions?projectId=${projectId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch (e) {
      console.error(e);
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
          `/api/holder?tokenAddress=${selectedProject.tokenAddress}&walletAddress=${wallet}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setIsOnchainHolder(!!data.isHolder);
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
    if (!wallet || !user || !devTokenAddress.trim()) return;

    setDevSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenSymbol: devTokenSymbol.trim(),
          tokenAddress: devTokenAddress.trim(),
          chain: devChain,
          adminWallet: wallet,
          adminFid: user.fid,
          adminUsername: user.username,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshProjects();
      setMode("holder");
      setDevTokenAddress("");
    } catch (e: any) {
      alert(e.message ?? "Failed to enable token");
    } finally {
      setDevSaving(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!canPost || !questionText.trim() || !selectedProjectId) return;

    await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId,
        text: questionText,
        authorFid: user.fid,
        authorUsername: user.username,
        walletAddress: wallet,
      }),
    });

    setQuestionText("");
    refreshQuestions(selectedProjectId);
  };

  const handleUpvote = async (id: string) => {
    if (!canPost) return;
    await fetch("/api/questions/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id, walletAddress: wallet }),
    });
    refreshQuestions(selectedProjectId!);
  };

  /* ---------------- Loading ---------------- */

  if (!mounted || isLoading || !context || !sdkReady) {
    return <div style={{ padding: 20 }}>Booting Beacon…</div>;
  }

  /* ============================== */
  /*            RENDER              */
  /* ============================== */

  return (
    <div style={{ minHeight: "100vh", padding: 16, background: "#05040b" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", color: "#fff" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em" }}>BEACON</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Token Q&amp;A</div>
          </div>

          <div>
            <div>@{user.username}</div>
            {!wallet ? (
              <button onClick={handleConnectWallet}>
                {connectStatus === "pending" ? "Connecting…" : "Connect wallet"}
              </button>
            ) : (
              <div>{wallet.slice(0, 6)}…{wallet.slice(-4)}</div>
            )}
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => setMode("holder")}>For holders</button>
          <button onClick={() => setMode("dev")}>For devs</button>
        </div>

        {/* Content */}
        {mode === "dev" ? (
          <form onSubmit={handleEnableForToken}>
            <input value={devTokenSymbol} onChange={(e) => setDevTokenSymbol(e.target.value)} />
            <input value={devTokenAddress} onChange={(e) => setDevTokenAddress(e.target.value)} />
            <button disabled={devSaving}>{devSaving ? "Enabling…" : "Enable Q&A"}</button>
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
              <div key={q.id}>
                <div>{q.text}</div>
                <button onClick={() => handleUpvote(q.id)}>
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
