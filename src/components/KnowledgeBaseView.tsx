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
  newChunkFile: string;
  setNewChunkFile: (val: string) => void;
  newChunkSection: string;
  setNewChunkSection: (val: string) => void;
  newChunkContent: string;
  setNewChunkContent: (val: string) => void;
  addNewKnowledgeChunk: (e: React.FormEvent) => void;
  chunkAddSuccess: boolean;
  activeCitationText: string | null;
  setActiveCitationText: (val: string | null) => void;
}

export default function KnowledgeBaseView({
  userQuery,
  setUserQuery,
  chatLog,
  chatLoading,
  queryKnowledgeBase,
  newChunkFile,
  setNewChunkFile,
  newChunkSection,
  setNewChunkSection,
  newChunkContent,
  setNewChunkContent,
  addNewKnowledgeChunk,
  chunkAddSuccess,
  activeCitationText,
  setActiveCitationText
}: KnowledgeBaseViewProps) {
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

      {/* Accordion indexer */}
      <div className="border border-slate-850 bg-slate-900/10 rounded-xl p-3 shrink-0">
        <details className="group">
          <summary className="flex items-center justify-between text-[12px] font-sans font-normal text-slate-300 cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-emerald-400 group-open:rotate-45 transition-transform" />
              <span>Vector store manager (register custom chunk)</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-open:rotate-90 transition-transform" />
          </summary>

          <form onSubmit={addNewKnowledgeChunk} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
            <div className="flex flex-col gap-1">
              <label htmlFor="doc-filename-input" className="text-[11px] font-mono text-slate-500">Document filename</label>
              <input
                id="doc-filename-input"
                type="text"
                placeholder="e.g. storage_driver.ts"
                value={newChunkFile}
                onChange={(e) => setNewChunkFile(e.target.value)}
                aria-label="Document filename"
                className="bg-slate-950 border border-slate-800 rounded p-1.5 text-[12px] font-mono outline-none text-slate-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="section-topic-input" className="text-[11px] font-mono text-slate-500">Header / Section Topic</label>
              <input
                id="section-topic-input"
                type="text"
                placeholder="e.g. syncWithParcle"
                value={newChunkSection}
                onChange={(e) => setNewChunkSection(e.target.value)}
                aria-label="Header or Section Topic"
                className="bg-slate-950 border border-slate-800 rounded p-1.5 text-[12px] font-mono outline-none text-slate-300"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="content-body-input" className="text-[11px] font-mono text-slate-500">Snippet Content Body</label>
              <textarea
                id="content-body-input"
                value={newChunkContent}
                onChange={(e) => setNewChunkContent(e.target.value)}
                aria-label="Snippet Content Body"
                rows={2}
                className="bg-slate-950 border border-slate-800 rounded p-1.5 text-[12px] font-mono outline-none text-slate-300 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between mt-1 pt-1">
              {chunkAddSuccess ? (
                <span className="text-[11px] text-emerald-400 font-mono">✅ Registered securely in Parcle storage cabinet</span>
              ) : (
                <span></span>
              )}
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-sans text-[11px] font-bold py-1 px-3 rounded cursor-pointer transition active:scale-95 ml-auto"
              >
                Register Chunk
              </button>
            </div>
          </form>
        </details>
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
                            onClick={() => setActiveCitationText(citationText)}
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
