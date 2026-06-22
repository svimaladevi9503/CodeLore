import React from "react";
import { Search, ChevronRight, ServerCrash, X } from "lucide-react";
import IngestionFlow from "./knowledge-base/IngestionFlow";
import ChatLogRenderer from "./knowledge-base/ChatLogRenderer";
import CitationDrawer from "./knowledge-base/CitationDrawer";

// Return level of confidence color mapping
const getConfidenceRating = (textLength: number) => {
  if (textLength > 180) return { label: "High confidence matrix", color: "bg-emerald-500", raw: 0.94, barText: "green" };
  if (textLength > 100) return { label: "Medium confidence mapping", color: "bg-amber-500", raw: 0.72, barText: "amber" };
  return { label: "Low confidence mapping", color: "bg-rose-500", raw: 0.42, barText: "coral" };
};

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
  parcleData,
  repoName,
  fetchDiagnostics,
  switchBanner,
  setSwitchBanner
}: KnowledgeBaseViewProps) {
  const [repoContext, setRepoContext] = React.useState<{
    active_repo: string;
    active_branch: string;
    last_indexed_file: string;
    owner: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(true);

  // Ingestion States
  const [ingestPath, setIngestPath] = React.useState("");
  const [ingestionState, setIngestionState] = React.useState<"idle" | "fetching" | "chunking" | "indexed" | "error">("idle");
  const [ingestError, setIngestError] = React.useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0);

  const fetchRepoContext = async (isPoll = false) => {
    if (!isPoll) setIsSyncing(true);
    try {
      const res = await fetch("/api/orchestrate/context");
      const data = await res.json();
      if (data.status === "success" && data.context) {
        setRepoContext(data.context);
      }
    } catch (err) {
      console.error("Failed to fetch repo context:", err);
    } finally {
      if (!isPoll) setIsSyncing(false);
    }
  };

  React.useEffect(() => {
    fetchRepoContext(false);
    const interval = setInterval(() => fetchRepoContext(true), 3000);
    
    // Sync pending sync items
    const syncList = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]");
    setPendingSyncCount(syncList.length);

    return () => clearInterval(interval);
  }, []);

  const handleIngest = async (filePath: string) => {
    setIngestError(null);
    setIngestionState("fetching");
    // Pulse animation flow
    await new Promise(r => setTimeout(r, 800));
    setIngestionState("chunking");
    
    const token = localStorage.getItem("github_token");
    try {
      const res = await fetch("/api/kb/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, github_token: token })
      });
      
      if (!res.ok) {
        throw new Error("Could not reach GitHub");
      }
      
      const data = await res.json();
      if (data.status === "success") {
        setIngestionState("indexed");
        await fetchDiagnostics();
        setIngestPath("");
        setTimeout(() => setIngestionState("idle"), 3000);
      } else {
        throw new Error(data.error || "Ingestion failed");
      }
    } catch (err: any) {
      console.error("Ingestion failed", err);
      setIngestionState("error");
      setIngestError("[!] Could not reach GitHub. Retry ↺");
      
      // Fallback: cache temporarily
      const pendingSync = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]");
      if (!pendingSync.includes(filePath)) {
        pendingSync.push(filePath);
        localStorage.setItem("kb_pending_sync", JSON.stringify(pendingSync));
      }
      setPendingSyncCount(pendingSync.length);

      // Silent retries
      let retries = 0;
      const retryTimer = setInterval(async () => {
        retries++;
        try {
          const retryRes = await fetch("/api/kb/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: filePath, github_token: token })
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData.status === "success") {
              clearInterval(retryTimer);
              const currPending = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]").filter((f: string) => f !== filePath);
              localStorage.setItem("kb_pending_sync", JSON.stringify(currPending));
              setPendingSyncCount(currPending.length);
              await fetchDiagnostics();
            }
          }
        } catch (e) {
          console.error("Retry failed", e);
        }
        if (retries >= 3) {
          clearInterval(retryTimer);
        }
      }, 15000);
    }
  };

  const onIngestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestPath.trim()) return;
    handleIngest(ingestPath.trim());
  };

  const isPillLoading = isSyncing && !repoContext;

  const { displayText, linkUrl } = React.useMemo(() => {
    if (isPillLoading) {
      return {
        displayText: "syncing...",
        linkUrl: "#"
      };
    }
    
    const repo = repoContext?.active_repo || repoName;
    const branch = repoContext?.active_branch || "main";
    const file = repoContext?.last_indexed_file;
    const owner = repoContext?.owner || "svimaladevi9503";
    const baseRepoUrl = `https://github.com/${owner}/${repo}`;
    
    if (!file) {
      return {
        displayText: `${repo}/ —`,
        linkUrl: baseRepoUrl
      };
    }
    
    const normalizedPath = file.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    const fileName = parts.pop() || "";
    const folderName = parts.join("/");
    
    const formattedPath = folderName 
      ? `${repo}/${folderName}/${fileName}`
      : `${repo}/${fileName}`;
      
    const fileLink = `${baseRepoUrl}/blob/${branch}/${normalizedPath}`;
    
    return {
      displayText: formattedPath,
      linkUrl: fileLink
    };
  }, [repoContext, repoName, isPillLoading]);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Breadcrumb row */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1 shrink-0">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-slate-400">knowledge base</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-blue-400">queryRag</span>
      </div>

      {/* Info title section */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-sans font-medium text-white flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-blue-400" />
            <span>RAG knowledge base specialist</span>
          </h3>
          <p className="text-[12px] text-slate-400 mt-1">
            Ask questions about operational scripts, system endpoints, or code architectures. CodeLore extracts memories from Parcle index arrays to compile answer context.
          </p>
        </div>
        
        {/* Soft warning badge if sync pending */}
        {pendingSyncCount > 0 && (
          <div className="text-[11px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5 animate-pulse shrink-0">
            <ServerCrash className="h-3.5 w-3.5" />
            <span>{pendingSyncCount} file{pendingSyncCount > 1 ? "s" : ""} pending sync</span>
          </div>
        )}
      </div>

      {/* Top action row: GitHub context */}
      <div className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-t border-slate-900 pt-4">
        <a
          href={linkUrl}
          target={isPillLoading ? undefined : "_blank"}
          rel={isPillLoading ? undefined : "noopener noreferrer"}
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-normal px-2.5 py-1 rounded border transition-colors duration-250 select-none ${
            isPillLoading 
              ? "opacity-50 animate-pulse cursor-not-allowed pointer-events-none text-slate-500 bg-slate-900/50 border-slate-800"
              : theme === "dark"
                ? "text-slate-400 bg-slate-900 border-slate-800 hover:text-white hover:border-slate-700 cursor-pointer"
                : "text-[#024D33] bg-[#eef3f1] border-emerald-200 hover:bg-[#e4ece9] hover:text-[#013524] cursor-pointer"
          }`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="shrink-0">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
          </svg>
          <span>{displayText}</span>
        </a>
      </div>

      {/* Ingestion animation area */}
      {ingestionState !== "idle" && (
        <IngestionFlow 
          state={ingestionState} 
          error={ingestError} 
          onRetry={() => handleIngest(ingestPath)} 
        />
      )}

      {/* Conversational Screen container */}
      {!repoName || repoName === "None selected" || repoName === "" ? (
        <div className="flex-1 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <svg viewBox="0 0 16 16" width="32" height="32" fill="currentColor" className="text-slate-600 animate-pulse">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
            </svg>
            <span className="text-2xl font-mono text-slate-500">:</span>
            <svg viewBox="0 0 10 10" width="32" height="32" className="text-teal-400 fill-current animate-bounce" style={{ imageRendering: 'pixelated' }}>
              <rect x="2" y="2" width="2" height="2" />
              <rect x="6" y="2" width="2" height="2" />
              <rect x="2" y="6" width="1" height="1" />
              <rect x="7" y="6" width="1" height="1" />
              <rect x="3" y="7" width="4" height="1" />
            </svg>
          </div>
          <h4 className="text-[14px] font-sans font-medium text-white mt-4">
            {repoContext?.owner ? `@${repoContext.owner}` : "User"} Please Select a repository to start the conversation
          </h4>
        </div>
      ) : (
        <div className="flex-1 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col min-h-[300px] overflow-hidden relative">
          {/* Repo switched banner */}
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

          {/* Floating Input row pinned at bottom */}
          <div className="p-3 border-t border-slate-850 bg-slate-900/10 flex gap-2 shrink-0">
            <input
              type="text"
              placeholder="Ask CodeLore: e.g. What is the Orchestrator Agent?"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && queryKnowledgeBase()}
              aria-label="Ask CodeLore question"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-[12px] font-sans font-normal px-3 focus:border-blue-500 outline-none text-slate-200 placeholder-slate-600 leading-none h-10"
            />
            <button
              type="button"
              onClick={queryKnowledgeBase}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition active:scale-95"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Floating Side Drawer details when clicking dynamic citations */}
      <CitationDrawer 
        activeCitationText={activeCitationText} 
        setActiveCitationText={setActiveCitationText} 
      />
    </div>
  );
}

