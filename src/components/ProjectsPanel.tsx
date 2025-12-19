"use client";

import useSWR from "swr";
import { fetcher } from "../lib/fetcher";

export function ProjectsPanel() {
  const { data, error, isLoading } = useSWR(
    "/api/projects",
    fetcher
  );

  if (isLoading) return <div>Loading tokens...</div>;
  if (error) return <div>Failed to load tokens</div>;

  const projects = data.projects;

  return (
    <div>
      {projects.length === 0 ? (
        <div>No tokens yet.</div>
      ) : (
        projects.map((p: any) => (
          <div key={p.id}>
            {p.tokenSymbol} — {p.tokenAddress}
          </div>
        ))
      )}
    </div>
  );
}
