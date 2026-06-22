import React from "react";
import { X } from "lucide-react";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase";
import KnowledgeBaseHeader from "./knowledge-base/KnowledgeBaseHeader";
import IngestionFlow from "./knowledge-base/IngestionFlow";
import EmptyRepoState from "./knowledge-base/EmptyRepoState";
import ChatLogRenderer from "./knowledge-base/ChatLogRenderer";
import ChatInput from "./knowledge-base/ChatInput";
import CitationDrawer from "./knowledge-base/CitationDrawer";

interface KnowledgeBaseViewProps {
  userQuery: string;
  setUserQuery: (val: string) => void;
  chatLog: Array<{ sender: "user" | "agent"; text: string; sources?: any[]; timestamp: string }>;
  chatLoading: boolean;
  firstTokenReceived?: boolean;
  queryKnowledgeBase: () => void;
  activeCitationText: string | null;
  setActiveCitationText: (val: string | null) => void;
  theme: "light" | "dark";
  parcleData: any;
  repoName: string;
  fetchDiagnostics: () => Promise<void>;
  switchBanner?: { show: boolean; repoName: string };
  setSwitchBanner?: (val: any) => void;
}

export default function KnowledgeBaseView({
  userQuery,
  setUserQuery,
  chatLog,
  chatLoading,
  firstTokenReceived,
  queryKnowledgeBase,
  activeCitationText,
  setActiveCitationText,
  theme,
  repoName,
  fetchDiagnostics,
  switchBanner,
  setSwitchBanner
}: KnowledgeBaseViewProps) {
  const {
    repoContext,
    setRepoContext,
    ingestPath,
    ingestionState,
    ingestError,
    pendingSyncCount,
    handleIngest,
    isPillLoading,
    displayText,
    linkUrl
  } = useKnowledgeBase(repoName, fetchDiagnostics);

  return (
    <div className="flex flex-col gap-6 h-full">
      <KnowledgeBaseHeader 
        pendingSyncCount={pendingSyncCount}
        linkUrl={linkUrl}
        isPillLoading={isPillLoading}
        theme={theme}
        displayText={displayText}
      />

      {ingestionState !== "idle" && (
        <IngestionFlow 
          state={ingestionState} 
          error={ingestError} 
          onRetry={() => handleIngest(ingestPath)} 
        />
      )}

      {!repoName || repoName === "None selected" || repoName === "" ? (
        <EmptyRepoState owner={repoContext?.owner} />
      ) : (
        <div className="flex-1 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col min-h-[300px] overflow-hidden relative">
          {switchBanner?.show && (
            <div className="bg-teal-600/90 backdrop-blur-xs text-white px-4 py-2 text-[12px] flex items-center justify-between border-b border-teal-500/30 z-20 shrink-0 select-none animate-fade-in">
              <span className="font-sans font-medium">Repo switched to {switchBanner.repoName}. Refreshing knowledge...</span>
              <button
                onClick={() => setSwitchBanner && setSwitchBanner({ show: false, repoName: "" })}
                className="text-teal-200 hover:text-white p-1 rounded transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <ChatLogRenderer 
            chatLog={chatLog}
            chatLoading={chatLoading}
            firstTokenReceived={firstTokenReceived}
            setActiveCitationText={setActiveCitationText}
            setRepoContext={setRepoContext}
          />

          <ChatInput 
            userQuery={userQuery}
            setUserQuery={setUserQuery}
            queryKnowledgeBase={queryKnowledgeBase}
            chatLoading={chatLoading}
          />
        </div>
      )}

      <CitationDrawer 
        activeCitationText={activeCitationText} 
        setActiveCitationText={setActiveCitationText} 
      />
    </div>
  );
}

