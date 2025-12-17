// src/server/db.ts

// ---- Types ----

export type ProjectRecord = {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
  createdAt: number;
};

export type QuestionRecord = {
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

// ---- In-memory storage (per server process) ----

const projects = new Map<string, ProjectRecord>();
const questions = new Map<string, QuestionRecord>();

// Simple ID helper (not crypto-secure, fine for demo)
function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(
    36,
  )}`;
}

// ---- Project helpers ----

export async function listProjectsWithCounts(): Promise<
  Array<ProjectRecord & { totalQuestions: number }>
> {
  const out: Array<ProjectRecord & { totalQuestions: number }> = [];
  for (const proj of projects.values()) {
    const totalQuestions = Array.from(questions.values()).filter(
      (q) => q.projectId === proj.id,
    ).length;
    out.push({ ...proj, totalQuestions });
  }

  // sort newest first
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export async function createProject(input: {
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
}): Promise<ProjectRecord & { totalQuestions: number }> {
  const id = makeId("proj");
  const project: ProjectRecord = {
    id,
    tokenSymbol: input.tokenSymbol,
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    adminWallet: input.adminWallet.toLowerCase(),
    adminFid: input.adminFid,
    adminUsername: input.adminUsername,
    createdAt: Date.now(),
  };
  projects.set(id, project);
  return { ...project, totalQuestions: 0 };
}

// ---- Question helpers ----

export async function listQuestionsByProject(
  projectId: string,
): Promise<QuestionRecord[]> {
  const list = Array.from(questions.values()).filter(
    (q) => q.projectId === projectId,
  );

  // highest votes first, then newest first
  list.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return b.createdAt - a.createdAt;
  });

  return list;
}

export async function createQuestion(input: {
  projectId: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  walletAddress: string;
}): Promise<QuestionRecord> {
  const id = makeId("q");
  const q: QuestionRecord = {
    id,
    projectId: input.projectId,
    text: input.text,
    authorFid: input.authorFid,
    authorUsername: input.authorUsername,
    walletAddress: input.walletAddress.toLowerCase(),
    votes: 0,
    voters: [],
    createdAt: Date.now(),
  };
  questions.set(id, q);
  return q;
}

export async function upvoteQuestion(params: {
  questionId: string;
  walletAddress: string;
}): Promise<QuestionRecord | null> {
  const key = params.walletAddress.toLowerCase();
  const existing = questions.get(params.questionId);
  if (!existing) return null;

  // prevent double-voting by same wallet
  if (existing.voters.includes(key)) {
    return existing;
  }

  const updated: QuestionRecord = {
    ...existing,
    votes: existing.votes + 1,
    voters: [...existing.voters, key],
  };

  questions.set(updated.id, updated);
  return updated;
}
