// src/server/db.ts
import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";

const PROJECTS_KEY = "beacon:projects";
const QUESTIONS_KEY = "beacon:questions";

/* ---------------- Projects ---------------- */

export async function listProjectsWithCounts() {
  const projects = (await kv.get<any[]>(PROJECTS_KEY)) ?? [];
  const questions = (await kv.get<any[]>(QUESTIONS_KEY)) ?? [];

  return projects.map(p => ({
    ...p,
    totalQuestions: questions.filter(q => q.projectId === p.id).length,
  }));
}

export async function createProject(input: {
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
}) {
  const projects = (await kv.get<any[]>(PROJECTS_KEY)) ?? [];

  const project = {
    id: nanoid(),
    createdAt: Date.now(),
    totalQuestions: 0,
    ...input,
  };

  projects.unshift(project);
  await kv.set(PROJECTS_KEY, projects);

  return project;
}

/* ---------------- Questions ---------------- */

export async function listQuestionsByProject(projectId: string) {
  const questions = (await kv.get<any[]>(QUESTIONS_KEY)) ?? [];
  return questions
    .filter(q => q.projectId === projectId)
    .sort((a, b) => b.votes - a.votes);
}

export async function createQuestion(input: {
  projectId: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  walletAddress: string;
}) {
  const questions = (await kv.get<any[]>(QUESTIONS_KEY)) ?? [];

  const question = {
    id: nanoid(),
    createdAt: Date.now(),
    votes: 0,
    voters: [],
    ...input,
  };

  questions.unshift(question);
  await kv.set(QUESTIONS_KEY, questions);

  return question;
}

export async function upvoteQuestion({
  questionId,
  walletAddress,
}: {
  questionId: string;
  walletAddress: string;
}) {
  const questions = (await kv.get<any[]>(QUESTIONS_KEY)) ?? [];
  const q = questions.find(q => q.id === questionId);
  if (!q) return null;

  if (q.voters.includes(walletAddress)) return q;

  q.votes += 1;
  q.voters.push(walletAddress);

  await kv.set(QUESTIONS_KEY, questions);
  return q;
}
