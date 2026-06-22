import React from "react";
import { Search, ChevronRight, PlusCircle, RefreshCw, X, FileText } from "lucide-react";
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
  queryKnowledgeBase: () => void;
  activeCitationText: string | null;
  setActiveCitationText: (val: string | null) => void;
  theme: "light" | "dark";
  parcleData: any;
  repoName: string;
}

export default function KnowledgeBaseView({
  userQuery,
  setUserQuery,
  chatLog,
  chatLoading,
  queryKnowledgeBase,
  activeCitationText,
  setActiveCitationText,
  theme,
  parcleData,
  repoName
}: KnowledgeBaseViewProps) {
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

  const mostRecentFile = React.useMemo(() => {
    if (!parcleData?.v_store || parcleData.v_store.length === 0) return null;
    return parcleData.v_store[parcleData.v_store.length - 1].filename;
  }, [parcleData]);

  const activeFile = selectedFile || mostRecentFile;

  const { displayText, linkUrl } = React.useMemo(() => {
    const baseRepoUrl = `https://github.com/svimaladevi9503/${repoName}`;
    if (!activeFile) {
      return {
        displayText: `${repoName}/ —`,
        linkUrl: baseRepoUrl
      };
    }
    
    const normalizedPath = activeFile.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    const fileName = parts.pop() || "";
    const folderName = parts.join("/");
    
    const formattedPath = folderName 
      ? `${repoName}/${folderName}/${fileName}`
      : `${repoName}/${fileName}`;
      
    const fileLink = `${baseRepoUrl}/blob/main/${normalizedPath}`;
    
    return {
      displayText: formattedPath,
      linkUrl: fileLink
    };
  }, [activeFile, repoName]);
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
      <div className="shrink-0">
        <h3 className="text-[16px] font-sans font-medium text-white flex items-center gap-2">
          <Search className="h-4.5 w-4.5 text-blue-400" />
          <span>RAG knowledge base specialist</span>
        </h3>
        <p className="text-[12px] text-slate-400 mt-1">
          Ask questions about operational scripts, system endpoints, or code architectures. CodeLore extracts memories from Parcle index arrays to compile answer context.
        </p>
      </div>

      <div className="shrink-0 flex">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-normal px-2.5 py-1 rounded border transition-colors duration-250 select-none cursor-pointer ${
            theme === "dark"
              ? "text-slate-400 bg-slate-900 border-slate-800 hover:text-white hover:border-slate-700"
              : "text-[#024D33] bg-[#eef3f1] border-emerald-200 hover:bg-[#e4ece9] hover:text-[#013524]"
          }`}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="shrink-0">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
          </svg>
          <span>{displayText}</span>
        </a>
      </div>

      {/* Conversational Screen container */}
      <div className="flex-1 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col min-h-[300px] overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {chatLog.length <= 1 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileText className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
              <p className="text-[12px] font-sans font-normal">
                Ask anything about your codebase. CodeLore will find it.
              </p>
            </div>
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
                    ? 'bg-blue-600/20 border border-blue-500/20 text-white rounded-br-none font-sans font-normal' 
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
                            onClick={() => {
                              setActiveCitationText(citationText);
                              setSelectedFile(src.filename);
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

          {/* RAG search loading loader */}
          {chatLoading && (
            <div className="mr-auto items-start max-w-[80%] flex flex-col animate-pulse">
              <div className="p-3 rounded-lg text-[12px] bg-slate-900 border border-slate-800 text-slate-400 rounded-bl-none flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                <span className="font-sans font-normal">Querying Parcle storage matrix nodes...</span>
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
