import React, { useRef, useEffect } from "react";
import { FileText, RefreshCw } from "lucide-react";
import RippleLoader from "./RippleLoader";

interface ChatMessage {
  id?: string;
  sender: "user" | "agent";
  text: string;
  sources?: any[];
  timestamp: string;
}

interface ChatLogRendererProps {
  chatLog: ChatMessage[];
  chatLoading: boolean;
  firstTokenReceived?: boolean;
  setActiveCitationText: (val: string | null) => void;
  setRepoContext: (context: any) => void;
}

const ChatLogRenderer = ({
  chatLog,
  chatLoading,
  firstTokenReceived,
  setActiveCitationText,
  setRepoContext
}: ChatLogRendererProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fix #4: auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  // Fix #10: use message id as stable key
  const chatItems = React.useMemo(() => {
    return chatLog.map((msg, idx) => ({
      id: (msg as any).id || `chat-fallback-${idx}-${msg.sender}`,
      msg
    }));
  }, [chatLog]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {chatLog.length === 0 && !chatLoading && (
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

      {chatItems.length > 0 && chatItems.map((item) => {
        const msg = item.msg;
        const isUser = msg.sender === "user";

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
              
              {/* Sources compact badges instead of confidence rating bar */}
              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 select-none">
                  {msg.sources.map((src: any) => {
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
                        className="text-[10px] bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full text-teal-400 font-mono hover:bg-teal-500/20 hover:text-teal-300 transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>📂</span>
                        <span>{src.filename} › {src.section}</span>
                      </button>
                    );
                  })}
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

      {/* Invisible scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatLogRenderer;
