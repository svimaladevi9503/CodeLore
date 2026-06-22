import React from "react";

interface EmptyRepoStateProps {
  owner?: string;
}

const EmptyRepoState = ({ owner }: EmptyRepoStateProps) => {
  return (
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
        {owner ? `@${owner}` : "User"} Please Select a repository to start the conversation
      </h4>
    </div>
  );
};

export default EmptyRepoState;
