/* eslint-disable react-doctor/no-array-index-as-key */
import React from "react";
import { MessageSquare, Loader2, Send } from "lucide-react";

export interface ChatMessage {
  sender: "user" | "gemini";
  text: string;
}

interface GeminiRefinerChatProps {
  theme: "light" | "dark";
  chatLogs: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  refining: boolean;
}

export default function GeminiRefinerChat({
  theme,
  chatLogs,
  chatInput,
  setChatInput,
  onSendChat,
  refining
}: GeminiRefinerChatProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <h4
        className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <MessageSquare className="h-4 w-4 text-teal-400" />
        <span>Gemini Refiner Chat</span>
      </h4>

      <div
        className={`border rounded-xl flex flex-col justify-between max-h-[460px] h-[460px] ${
          theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-white border-slate-200"
        }`}
      >
        {/* Chat Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-[12px]">
          {chatLogs.map((msg, i) => (
            // eslint-disable-next-line react-doctor/no-array-index-as-key
            <div
              key={`${i}-${msg.text.substring(0, 10)}`}
              className={`flex flex-col gap-1 max-w-[85%] ${
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <span
                className={`text-[10px] font-mono ${
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {msg.sender === "user" ? "You" : "Gemini"}
              </span>
              <div
                className={`p-2.5 rounded-lg leading-relaxed ${
                  msg.sender === "user"
                    ? theme === "dark"
                      ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                      : "bg-purple-50 text-purple-700 border border-purple-100"
                    : theme === "dark"
                    ? "bg-slate-900 text-slate-200 border border-slate-800"
                    : "bg-slate-50 text-slate-800 border border-slate-100"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {refining && (
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] py-1">
              <Loader2 className="h-3 w-3 animate-spin text-teal-500" />
              <span>Gemini is editing markdown...</span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form
          onSubmit={onSendChat}
          className={`p-3 border-t flex gap-2 ${
            theme === "dark" ? "border-slate-900 bg-slate-950/20" : "border-slate-150 bg-slate-50/50"
          }`}
        >
          <input
            type="text"
            aria-label="Request edits"
            placeholder="Request edits..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className={`flex-1 border rounded-lg text-[12px] font-sans px-2.5 py-1.5 outline-none focus:border-teal-500 transition ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-slate-200"
                : "bg-white border-slate-200 text-slate-800"
            }`}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={refining || !chatInput.trim()}
            className={`p-2 rounded-lg cursor-pointer flex items-center justify-center transition border active:scale-95 disabled:opacity-50 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
