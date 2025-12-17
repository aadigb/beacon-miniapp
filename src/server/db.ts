// src/server/db.ts

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

type DB = {
  projects: ProjectRecord[];
  questions: QuestionRecord[];
};

// reuse the same DB across hot reloads / lambda invocations
const globalForDb = globalThis as unknown as { _beaconDb?: DB };

const db: DB =
  globalForDb._beaconDb ??
  {
    projects: [],
    questions: [],
  };

if (!globalForDb._beaconDb) {
  globalForDb._beaconDb = db;
}

const makeId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) as string;

// -------- Projects --------

export type ProjectSummary = ProjectRecord & {
  totalQuestions: number;
};

export function listProjectsWithCounts(): ProjectSummary[] {
  return db.projects
    .map((p) => ({
      ...p,
      totalQuestions: db.questions.filter((q) => q.projectId === p.id).length,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createProject(input: Omit<ProjectRecord, "id" | "createdAt">) {
  const existing = db.projects.find(
    (p) =>
      p.tokenAddress.toLowerCase() === input.tokenAddress.toLowerCase() &&
      p.chain === input.chain
  );

  if (existing) {
    // idempotent: return the existing project instead of creating a duplicate
    return existing;
  }

  const project: ProjectRecord = {
    id: makeId(),
    createdAt: Date.now(),
    ...input,
  };

  db.projects.push(project);
  return project;
}

// -------- Questions --------

export function listQuestionsByProject(projectId: string): QuestionRecord[] {
  return db.questions
    .filter((q) => q.projectId === projectId)
    .sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt);
}

export function createQuestion(
  input: Omit<QuestionRecord, "id" | "votes" | "voters" | "createdAt">
) {
  const question: QuestionRecord = {
    id: makeId(),
    createdAt: Date.now(),
    votes: 0,
    voters: [],
    ...input,
  };
  db.questions.push(question);
  return question;
}

export function upvoteQuestion(questionId: string, walletAddress: string) {
  const q = db.questions.find((q) => q.id === questionId);
  if (!q) return null;

  const addr = walletAddress.toLowerCase();

  if (q.voters.includes(addr)) {
    // already voted – no-op; you could also choose to unvote here
    return q;
  }

  q.voters.push(addr);
  q.votes += 1;
  return q;
}
