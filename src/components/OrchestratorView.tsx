import React from "react";
import OrchestratorHeader from "./orchestrator/OrchestratorHeader";
import GitHubIntegrationCard from "./orchestrator/GitHubIntegrationCard";
import CommitsHistoryPanel from "./orchestrator/CommitsHistoryPanel";
import { useGitHub } from "./orchestrator/useGitHub";

interface OrchestratorViewProps {
  theme: "light" | "dark";
  orchPayload: string;
  setOrchPayload: (val: string) => void;
  orchEventType: string;
  setOrchEventType: (val: string) => void;
  dispatchOrchEvent: () => void;
  orchResult: any;
  routingEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    payload: string;
    route: string;
    confidence: number;
    outcome: string;
    failed?: boolean;
  }>;
  repoName: string;
  setRepoName: (val: string) => void;
}

export default function OrchestratorView({
  theme,
  routingEvents,
  repoName,
  setRepoName,
}: OrchestratorViewProps) {
  const {
    token,
    inputToken,
    setInputToken,
    ghUser,
    ghRepos,
    loadingGh,
    errorGh,
    commits,
    loadingCommits,
    errorCommits,
    fetchCommits,
    handleConnect,
    handleDisconnect,
  } = useGitHub({ repoName, routingEvents });

  return (
    <div className="flex flex-col gap-6">
      <OrchestratorHeader theme={theme} />

      <GitHubIntegrationCard
        theme={theme}
        token={token}
        inputToken={inputToken}
        setInputToken={setInputToken}
        loadingGh={loadingGh}
        errorGh={errorGh}
        ghUser={ghUser}
        ghRepos={ghRepos}
        repoName={repoName}
        setRepoName={setRepoName}
        handleConnect={handleConnect}
        handleDisconnect={handleDisconnect}
      />

      <CommitsHistoryPanel
        theme={theme}
        token={token}
        repoName={repoName}
        hasUser={!!ghUser}
        commits={commits}
        loadingCommits={loadingCommits}
        errorCommits={errorCommits}
        fetchCommits={fetchCommits}
      />
    </div>
  );
}
