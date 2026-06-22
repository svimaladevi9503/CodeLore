import React from "react";
import { GitPullRequest, Loader2, Check } from "lucide-react";

interface CommitPushControllerProps {
  theme: "light" | "dark";
  commitMessage: string;
  setCommitMessage: (val: string) => void;
  onPush: () => void;
  pushing: boolean;
}

export default function CommitPushController({
  theme,
  commitMessage,
  setCommitMessage,
  onPush,
  pushing
}: CommitPushControllerProps) {
  return (
    <div
      className={`lg:col-span-12 rounded-xl p-4.5 border flex flex-col md:flex-row items-center justify-between gap-4 mt-1 ${
        theme === "dark" ? "bg-slate-950/40 border-slate-850/80" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1 w-full md:w-auto">
        <GitPullRequest className="h-5 w-5 text-teal-400 shrink-0 mt-1" />
        <div className="flex-grow flex flex-col gap-1 w-full">
          <span
            className={`text-[12.5px] font-sans font-semibold leading-none ${
              theme === "dark" ? "text-white" : "text-slate-850"
            }`}
          >
            Commit push config
          </span>
          <input
            type="text"
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className={`text-[11.5px] font-sans w-full border rounded px-2.5 py-1.5 outline-none focus:border-teal-500 mt-1 transition ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-slate-300"
                : "bg-slate-550/10 border-slate-200 text-slate-700"
            }`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onPush}
        disabled={pushing}
        className={`px-5 py-3.5 rounded-lg font-sans text-[12.5px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-md w-full md:w-auto ${
          theme === "dark"
            ? "bg-white text-slate-950 border border-teal-500 hover:bg-slate-100"
            : "bg-teal-650 text-white border border-teal-650 hover:bg-teal-700 shadow-teal-500/10"
        }`}
      >
        {pushing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Pushing to GitHub remote...</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            <span>Push README to repository</span>
          </>
        )}
      </button>
    </div>
  );
}
