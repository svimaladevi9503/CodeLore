import React from "react";

interface ChatInputProps {
  userQuery: string;
  setUserQuery: (val: string) => void;
  queryKnowledgeBase: () => void;
}

const ChatInput = ({ userQuery, setUserQuery, queryKnowledgeBase }: ChatInputProps) => {
  return (
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
  );
};

export default ChatInput;
