// src/server/db.ts
import { kv } from "@vercel/kv";

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

const keyProjects = () => `beacon:projects`; // array of Project
const keyQuestions = (projectId: string) => `beacon:questions:${projectId}`; // array of Question

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function listProjects() {
  const projects = (await kv.get<Project[]>(keyProjects())) ?? [];
  // attach totalQuestions cheaply
  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const qs = (await kv.get<Question[]>(keyQuestions(p.id))) ?? [];
      return { ...p, totalQuestions: qs.length };
    })
  );
  // newest first
  withCounts.sort((a, b) => b.createdAt - a.createdAt);
  return withCounts;
}

export async function createProject(input: Omit<Project, "id" | "createdAt">) {
  const projects = (await kv.get<Project[]>(keyProjects())) ?? [];
  const project: Project = { ...input, id: uid(), createdAt: Date.now() };
  projects.unshift(project);
  await kv.set(keyProjects(), projects);
  return project;
}

export async function listQuestionsByProject(projectId: string) {
  const qs = (await kv.get<Question[]>(keyQuestions(projectId))) ?? [];
  // highest voted first, then newest
  qs.sort((a, b) => (b.votes - a.votes) || (b.createdAt - a.createdAt));
  return qs;
}

export async function createQuestion(input: Omit<Question, "id" | "votes" | "voters" | "createdAt">) {
  const qs = (await kv.get<Question[]>(keyQuestions(input.projectId))) ?? [];
  const q: Question = {
    ...input,
    id: uid(),
    votes: 0,
    voters: [],
    createdAt: Date.now(),
  };
  qs.unshift(q);
  await kv.set(keyQuestions(input.projectId), qs);
  return q;
}

export async function upvoteQuestion(questionId: string, walletAddress: string) {
  // We don’t know projectId from questionId, so we scan projects (small N in v0).
  const projects = (await kv.get<Project[]>(keyProjects())) ?? [];
  for (const p of projects) {
    const qs = (await kv.get<Question[]>(keyQuestions(p.id))) ?? [];
    const idx = qs.findIndex((q) => q.id === questionId);
    if (idx === -1) continue;

    const w = walletAddress.toLowerCase();
    if (qs[idx].voters.includes(w)) return qs[idx];

    qs[idx].voters.push(w);
    qs[idx].votes += 1;
    await kv.set(keyQuestions(p.id), qs);
    return qs[idx];
  }
  return null;
}
