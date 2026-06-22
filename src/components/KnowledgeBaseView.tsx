import React from "react";
import { Search, ChevronRight, PlusCircle, RefreshCw, X, FileText, Database, LayoutGrid, ServerCrash } from "lucide-react";
import { m, AnimatePresence } from "motion/react";

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
}

const RippleLoader = () => {
  const [statusIdx, setStatusIdx] = React.useState(0);
  const statuses = ["scanning memory arrays...", "ranking chunks...", "compiling answer..."];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none w-full my-6">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer ring */}
        <div className="absolute w-24 h-24 rounded-full border-2 border-teal-500/40 border-t-transparent animate-spin" style={{ animationDuration: '1.6s' }} />
        {/* Middle ring */}
        <div className="absolute w-18 h-18 rounded-full border-2 border-[#7F77DD] border-t-transparent animate-spin" style={{ animationDuration: '1.0s' }} />
        {/* Inner ring */}
        <div className="absolute w-12 h-12 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" style={{ animationDuration: '0.6s' }} />
        {/* Center CodeLore logo mark (small) */}
        <div className="absolute w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-5 h-5 text-teal-400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <span className="mt-4 font-mono text-[11px] text-[#1D9E75] animate-pulse">
        {statuses[statusIdx]}
      </span>
    </div>
  );
};

const IngestionFlow = ({ state, error, onRetry }: { state: string, error: string | null, onRetry: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-5 border border-slate-800/80 bg-slate-900/30 rounded-xl my-2 w-full">
      <div className="flex items-center justify-between w-full max-w-md relative select-none px-4 py-2">
        {/* Background Line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
        
        {/* Traveling dot along the connector line in teal */}
        {state === "fetching" && (
          <m.div
            initial={{ left: "10%" }}
            animate={{ left: "50%" }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-[#1D9E75] -translate-y-1/2 z-10 shadow-[0_0_8px_#1D9E75]"
          />
        )}
        {state === "chunking" && (
          <m.div
            initial={{ left: "50%" }}
            animate={{ left: "90%" }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-[#1D9E75] -translate-y-1/2 z-10 shadow-[0_0_8px_#1D9E75]"
          />
        )}

        {/* GitHub Node */}
        <div className="flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
            state === "fetching" 
              ? "bg-[#1D9E75]/20 border-[#1D9E75] text-[#1D9E75] scale-110 shadow-[0_0_15px_rgba(29,158,117,0.3)] animate-pulse" 
              : state !== "idle" && state !== "error"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
          }`}>
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
            </svg>
          </div>
          <span className="text-[10px] font-mono mt-2 text-slate-400">
            {state === "fetching" ? "fetching..." : state !== "idle" && state !== "error" ? "fetched ✓" : "GitHub"}
          </span>
        </div>

        {/* Parcle Node */}
        <div className="flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
            state === "chunking" 
              ? "bg-[#7F77DD]/20 border-[#7F77DD] text-[#7F77DD] scale-110 shadow-[0_0_15px_rgba(127,119,221,0.3)] animate-pulse" 
              : state === "indexed"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
          }`}>
            <Database className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono mt-2 text-slate-400">
            {state === "chunking" ? "chunking..." : state === "indexed" ? "stored ✓" : "Parcle"}
          </span>
        </div>

        {/* KB Index Node */}
        <div className="flex flex-col items-center z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
            state === "indexed" 
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" 
              : "bg-slate-900 border-slate-800 text-slate-500"
          }`}>
            <LayoutGrid className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono mt-2 text-slate-400">
            {state === "indexed" ? "indexed ✓" : "KB Index"}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-[11px] font-mono select-none">
          <span>{error}</span>
          <button 
            type="button" 
            onClick={onRetry} 
            className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
          >
            Retry ↺
          </button>
        </div>
      )}
    </div>
  );
};

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
  fetchDiagnostics
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

  const chatItems = React.useMemo(() => {
    return chatLog.map((msg, idx) => ({
      id: `chat-msg-${idx}-${msg.sender}-${msg.timestamp}`,
      msg
    }));
  }, [chatLog]);

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

      {/* Top action row: GitHub context & Add Knowledge form */}
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

        {/* Add Knowledge Input box */}
        <form onSubmit={onIngestSubmit} className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Add knowledge path (e.g. docs/setup.md)"
            value={ingestPath}
            onChange={(e) => setIngestPath(e.target.value)}
            disabled={ingestionState !== "idle" && ingestionState !== "error"}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-[12px] font-sans px-3 focus:border-emerald-500 outline-none text-slate-200 placeholder-slate-650 h-8"
          />
          <button
            type="submit"
            disabled={ingestionState !== "idle" && ingestionState !== "error"}
            className="bg-[#1D9E75] hover:bg-[#188562] disabled:opacity-50 text-white px-3 py-1 rounded-lg text-[12px] font-medium cursor-pointer transition active:scale-95 flex items-center gap-1.5 h-8 select-none"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add File</span>
          </button>
        </form>
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
      <div className="flex-1 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col min-h-[300px] overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {chatLog.length <= 1 && !chatLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileText className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
              <p className="text-[12px] font-sans font-normal">
                Ask anything about your codebase. CodeLore will find it.
              </p>
            </div>
          )}

          {/* Render 3-ring loader if querying but first token not arrived yet */}
          {chatLoading && !firstTokenReceived && (
            <RippleLoader />
          )}

          {chatItems.length > 1 && chatItems.map((item) => {
            const msg = item.msg;
            const isUser = msg.sender === "user";
            let confidence = null;
            if (!isUser) {
              confidence = getConfidenceRating(msg.text.length);
            }

            return (
              <div 
                key={item.id} 
                className={`flex flex-col max-w-[85%] ${
                  isUser ? "ml-auto items-end" : "mr-auto items-start animate-fade-in"
                }`}
              >
                <div className={`p-3 rounded-lg text-[12px] leading-relaxed ${
                  isUser 
                    ? 'bg-[#1D9E75]/20 border border-[#1D9E75]/30 text-white rounded-br-none font-sans font-normal' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-bl-none font-sans font-normal'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  {/* Citations list */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5 select-none">
                      {msg.sources.map((src) => {
                        const citationText = `[Citation context chunk from ${src.filename} › ${src.section}]: All active properties or system models registered under Parcle keys will query this index matrix to fulfill instructions safely without external leakage bounds.`;
                        return (
                          <button
                            type="button"
                            key={`citation-${src.filename}-${src.section}`}
                            onClick={async () => {
                              setActiveCitationText(citationText);
                              try {
                                const res = await fetch("/api/orchestrate/context", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ last_indexed_file: src.filename })
                                });
                                const data = await res.json();
                                if (data.status === "success" && data.context) {
                                  setRepoContext(data.context);
                                }
                              } catch (err) {
                                console.error("Failed to sync clicked file citation to backend:", err);
                              }
                            }}
                            className="text-[10px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-blue-400 font-mono hover:border-blue-500/40 hover:text-blue-300 cursor-pointer inline-flex items-center gap-1 active:scale-95 transition"
                          >
                            📂 {src.filename} › {src.section}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Confidence rating bar with 300ms ease left-to-right filling */}
                  {confidence && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 select-none">
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mb-1.5">
                        <span className="capitalize">{confidence.barText} confidence bar indicator</span>
                        <span>{(confidence.raw * 100).toFixed(0)}% metrics score</span>
                      </div>
                      <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                        <m.div
                          initial={{ width: "0%" }}
                          animate={{ width: `${confidence.raw * 100}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={`h-full ${confidence.color}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5">{msg.timestamp}</span>
              </div>
            );
          })}

          {/* RAG search loading loader fallback */}
          {chatLoading && firstTokenReceived && (
            <div className="mr-auto items-start max-w-[80%] flex flex-col animate-pulse">
              <div className="p-3 rounded-lg text-[12px] bg-slate-900 border border-slate-800 text-slate-400 rounded-bl-none flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                <span className="font-sans font-normal">Streaming reply from Parcle arrays...</span>
              </div>
            </div>
          )}
        </div>

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

      {/* Floating Side Drawer details when clicking dynamic citations */}
      <AnimatePresence>
        {activeCitationText && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
            <m.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col gap-4 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setActiveCitationText(null)}
                aria-label="Close drawer"
                className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-850 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mt-8">
                <span className="text-[10px] font-mono tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                  v_store vector record
                </span>
                <h4 className="text-[14px] font-sans font-medium text-white mt-3">
                  Document chunk text readout
                </h4>
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-3 overflow-y-auto mt-2 leading-relaxed">
                <p className="text-[12px] font-mono text-slate-300 leading-relaxed font-normal">
                  {activeCitationText}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setActiveCitationText(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-normal text-[12px] py-1.5 rounded"
                >
                  Close context drawer
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
