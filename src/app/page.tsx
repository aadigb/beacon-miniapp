"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  FormEvent,
} from "react";
import { useMiniApp } from "@neynar/react";
import { sdk } from "@farcaster/miniapp-sdk";

type QASession = {
  id: string;
  castHash: string;
  authorFid: number;
  authorUsername: string;
  title: string;
  createdAt: number;
  active: boolean;
};

type Reply = {
  hash: string;
  text: string;
  author: string;
  fid: number;
  likes: number;
  recasts: number;
  replies: number;
  score: number;
};

const ACCENT = "#a855f7";
const ACCENT_SOFT = "#c4a6ff";

export default function Page() {
  const mini = useMiniApp() as any;
  const context = mini?.context;
  const isLoading = mini?.isLoading;
  const isSDKLoaded = mini?.isSDKLoaded ?? true;
  const user = context?.user;

  const [mounted, setMounted] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const [mode, setMode] = useState<"browse" | "dev">("browse");

  const [sessions, setSessions] = useState<QASession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<QASession | null>(null);

  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => setMounted(true), []);

  // Miniapp ready
  useEffect(() => {
    if (!isSDKLoaded || sdkReady || !context) return;
    sdk.actions.ready().then(() => setSdkReady(true));
  }, [context, isSDKLoaded, sdkReady]);

  // Fetch Q&A sessions
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/qa", { cache: "no-store" });
      const data = await res.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Fetch replies
  const loadReplies = async (castHash: string) => {
    setRepliesLoading(true);
    try {
      const res = await fetch(`/api/qa/${castHash}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setReplies(Array.isArray(data.replies) ? data.replies : []);
    } catch (e) {
      console.error(e);
    } finally {
      setRepliesLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted || !sdkReady) return;
    loadSessions();
  }, [mounted, sdkReady]);

  useEffect(() => {
    if (!selectedSession) return;
    loadReplies(selectedSession.castHash);
  }, [selectedSession]);

  // Create Q&A
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;

    setCreating(true);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          authorFid: user.fid,
          authorUsername: user.username,
        }),
      });

      const data = await res.json();
      if (res.ok && data.session) {
        setNewTitle("");
        setMode("browse");
        await loadSessions();
        setSelectedSession(data.session);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
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
      'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  };

  const shellStyle: CSSProperties = {
    width: "100%",
    maxWidth: 480,
    borderRadius: 28,
    border: "1px solid rgba(135,118,217,0.24)",
    background:
      "linear-gradient(145deg, rgba(11,9,27,0.98), rgba(3,3,12,0.98))",
    boxShadow: "0 26px 70px rgba(0,0,0,0.85)",
    padding: 16,
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
    height: 36,
    borderRadius: 12,
    border: "1px solid rgba(69,61,131,0.9)",
    padding: "0 10px",
    fontSize: 13,
    background: "#090818",
    color: "#f5f5ff",
  };

  const primary: CSSProperties = {
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background:
      "linear-gradient(135deg, #fdfcff, #e3d3ff, #a855f7)",
    color: "#14092c",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
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
        {/* HEADER */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.22em", opacity: 0.7 }}>
            BEACON
          </div>
          <div style={{ fontSize: 20, fontWeight: 650 }}>
            Q&amp;A Portal
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            style={mode === "browse" ? primary : undefined}
            onClick={() => setMode("browse")}
          >
            Browse
          </button>
          <button
            style={mode === "dev" ? primary : undefined}
            onClick={() => setMode("dev")}
          >
            For devs
          </button>
        </div>

        {/* DEV */}
        {mode === "dev" ? (
          <form onSubmit={handleCreate} style={card}>
            <div style={{ marginBottom: 8, fontSize: 12 }}>
              Start an official Farcaster Q&amp;A
            </div>
            <input
              style={input}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What do you want to talk about?"
            />
            <div style={{ marginTop: 10 }}>
              <button
                type="submit"
                style={{ ...primary, opacity: creating ? 0.6 : 1 }}
                disabled={creating}
              >
                {creating ? "Creating…" : "Start Q&A"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* SESSIONS */}
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                Active Q&As
              </div>

              {sessionsLoading ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div>
              ) : sessions.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  No Q&As yet.
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    style={{
                      padding: 10,
                      borderRadius: 14,
                      border:
                        selectedSession?.id === s.id
                          ? `1px solid ${ACCENT}`
                          : "1px solid rgba(63,57,114,0.9)",
                      marginBottom: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      @{s.authorUsername}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* REPLIES */}
            {selectedSession && (
              <div style={card}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>
                  Top questions
                </div>

                {repliesLoading ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Loading…
                  </div>
                ) : replies.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    No replies yet.
                  </div>
                ) : (
                  replies.map((r) => (
                    <div
                      key={r.hash}
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 14,
                        border: "1px solid rgba(63,57,114,0.9)",
                      }}
                    >
                      <div style={{ fontSize: 13 }}>{r.text}</div>
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.7,
                          marginTop: 4,
                        }}
                      >
                        @{r.author} · ❤️ {r.likes}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
