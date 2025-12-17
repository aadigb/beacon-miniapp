// src/server/db.ts
import { redis } from "./redis";

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

export type ProjectSummary = Project & {
  totalQuestions: number;
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

const KEY_PROJECTS = "beacon:projects"; // Project[]
const KEY_QUESTIONS = (projectId: string) => `beacon:questions:${projectId}`; // Question[]
const KEY_Q_INDEX = "beacon:questionIndex"; // Record<questionId, projectId>

function now() {
  return Date.now();
}

function uid() {
  // Works in Node + Edge runtimes
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${now()}-${Math.random().toString(16).slice(2)}`;
}

async function getProjects(): Promise<Project[]> {
  const v = await redis.get<Project[]>(KEY_PROJECTS);
  return Array.isArray(v) ? v : [];
}

async function setProjects(projects: Project[]) {
  await redis.set(KEY_PROJECTS, projects);
}

async function getQuestions(projectId: string): Promise<Question[]> {
  const v = await redis.get<Question[]>(KEY_QUESTIONS(projectId));
  return Array.isArray(v) ? v : [];
}

async function setQuestions(projectId: string, questions: Question[]) {
  await redis.set(KEY_QUESTIONS(projectId), questions);
}

async function getQuestionIndex(): Promise<Record<string, string>> {
  const v = await redis.get<Record<string, string>>(KEY_Q_INDEX);
  return v && typeof v === "object" ? v : {};
}

async function setQuestionIndex(index: Record<string, string>) {
  await redis.set(KEY_Q_INDEX, index);
}

/**
 * Used by /api/projects GET
 */
export async function listProjectsWithCounts(): Promise<ProjectSummary[]> {
  const projects = await getProjects();

  const counts = await Promise.all(
    projects.map(async (p) => {
      const qs = await getQuestions(p.id);
      return qs.length;
    })
  );

  return projects.map((p, i) => ({
    ...p,
    totalQuestions: counts[i] ?? 0,
  }));
}

/**
 * Used by /api/projects POST
 */
export async function createProject(input: {
  tokenSymbol: string;
  tokenAddress: string;
  chain: string;
  adminWallet: string;
  adminFid: number;
  adminUsername: string;
}): Promise<Project> {
  const projects = await getProjects();

  const project: Project = {
    id: uid(),
    tokenSymbol: input.tokenSymbol,
    tokenAddress: input.tokenAddress,
    chain: input.chain,
    adminWallet: input.adminWallet.toLowerCase(),
    adminFid: input.adminFid,
    adminUsername: input.adminUsername,
    createdAt: now(),
  };

  projects.unshift(project);
  await setProjects(projects);

  // ensure questions key exists
  await redis.set(KEY_QUESTIONS(project.id), []);

  return project;
}

/**
 * Used by /api/questions GET
 */
export async function listQuestionsByProject(projectId: string): Promise<Question[]> {
  const qs = await getQuestions(projectId);
  // highest votes first; tie-breaker = newest
  qs.sort((a, b) => (b.votes - a.votes) || (b.createdAt - a.createdAt));
  return qs;
}

/**
 * Used by /api/questions POST
 */
export async function createQuestion(input: {
  projectId: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  walletAddress: string;
}): Promise<Question> {
  const q: Question = {
    id: uid(),
    projectId: input.projectId,
    text: input.text,
    authorFid: input.authorFid,
    authorUsername: input.authorUsername,
    walletAddress: input.walletAddress.toLowerCase(),
    votes: 0,
    voters: [],
    createdAt: now(),
  };

  const qs = await getQuestions(input.projectId);
  qs.unshift(q);
  await setQuestions(input.projectId, qs);

  const index = await getQuestionIndex();
  index[q.id] = input.projectId;
  await setQuestionIndex(index);

  return q;
}

/**
 * Used by /api/questions/upvote POST
 * Signature matches: upvoteQuestion({ questionId, walletAddress })
 */
export async function upvoteQuestion(input: {
  questionId: string;
  walletAddress: string;
}): Promise<Question | null> {
  const wallet = input.walletAddress.toLowerCase();

  const index = await getQuestionIndex();
  const projectId = index[input.questionId];

  if (!projectId) return null;

  const qs = await getQuestions(projectId);
  const qi = qs.findIndex((q) => q.id === input.questionId);
  if (qi === -1) return null;

  const q = qs[qi];
  if (q.voters.includes(wallet)) {
    // already voted; return as-is
    return q;
  }

  q.voters = [...q.voters, wallet];
  q.votes = (q.votes ?? 0) + 1;
  qs[qi] = q;

  await setQuestions(projectId, qs);
  return q;
}
