// src/server/db.ts
import { randomUUID } from "crypto";

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
  voters: string[];
  createdAt: number;
};

const projects: Project[] = [];
const questions: Question[] = [];

export function listProjectsWithCounts() {
  return projects.map((p) => ({
    ...p,
    totalQuestions: questions.filter((q) => q.projectId === p.id).length,
  }));
}

export function createProject(input: Omit<Project, "id" | "createdAt">) {
  const existing = projects.find(
    (p) =>
      p.tokenAddress.toLowerCase() ===
      input.tokenAddress.toLowerCase()
  );
  if (existing) return existing;

  const project: Project = {
    id: randomUUID(),
    createdAt: Date.now(),
    ...input,
  };
  projects.push(project);
  return project;
}

export function listQuestions(projectId: string) {
  return questions
    .filter((q) => q.projectId === projectId)
    .sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt);
}

export function createQuestion(input: Omit<Question, "id" | "votes" | "voters" | "createdAt">) {
  const q: Question = {
    id: randomUUID(),
    votes: 0,
    voters: [],
    createdAt: Date.now(),
    ...input,
  };
  questions.push(q);
  return q;
}

export function upvoteQuestion(questionId: string, walletAddress: string) {
  const q = questions.find((q) => q.id === questionId);
  if (!q) throw new Error("Question not found");

  const w = walletAddress.toLowerCase();
  if (!q.voters.includes(w)) {
    q.votes += 1;
    q.voters.push(w);
  }

  return q;
}
