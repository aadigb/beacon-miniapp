// src/server/db.ts
// Super simple in-memory store for dev.
// NOTE: This resets when the server restarts / redeploys.

export type Project = {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
  createdAt: number;
};

export type Question = {
  id: string;
  projectId: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  walletAddress: string;
  votes: number;
  voters: string[]; // lowercase wallet addresses
  createdAt: number;
};

const projects: Project[] = [];
const questions: Question[] = [];

const makeId = () => Math.random().toString(36).slice(2);

export function listProjectsWithCounts() {
  return projects.map((p) => ({
    ...p,
    totalQuestions: questions.filter((q) => q.projectId === p.id).length,
  }));
}

export function createProject(input: {
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
}) {
  const existing = projects.find(
    (p) =>
      p.tokenAddress.toLowerCase() === input.tokenAddress.toLowerCase() &&
      p.chain === input.chain
  );
  if (existing) {
    return existing;
  }

  const project: Project = {
    id: makeId(),
    tokenSymbol: input.tokenSymbol || "$TOKEN",
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    adminWallet: input.adminWallet.toLowerCase(),
    adminFid: input.adminFid,
    adminUsername: input.adminUsername,
    createdAt: Date.now(),
  };
  projects.push(project);
  return project;
}

export function getProjectById(id: string) {
  return projects.find((p) => p.id === id) ?? null;
}

export function listQuestionsForProject(projectId: string) {
  return questions
    .filter((q) => q.projectId === projectId)
    .sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt);
}

export function createQuestion(input: {
  projectId: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  walletAddress: string;
}) {
  const question: Question = {
    id: makeId(),
    projectId: input.projectId,
    text: input.text,
    authorFid: input.authorFid,
    authorUsername: input.authorUsername,
    walletAddress: input.walletAddress.toLowerCase(),
    votes: 0,
    voters: [],
    createdAt: Date.now(),
  };
  questions.push(question);
  return question;
}

export function upvoteQuestion(questionId: string, walletAddress: string) {
  const q = questions.find((qq) => qq.id === questionId);
  if (!q) return null;

  const addr = walletAddress.toLowerCase();
  if (q.voters.includes(addr)) {
    return q; // already voted
  }

  q.votes += 1;
  q.voters.push(addr);
  return q;
}
