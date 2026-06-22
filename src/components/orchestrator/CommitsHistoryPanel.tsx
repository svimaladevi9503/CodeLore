import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  RefreshCw,
  GitCommit,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { CommitData } from "./useGitHub";

interface CommitsHistoryPanelProps {
  theme: "light" | "dark";
  token: string;
  repoName: string;
  hasUser: boolean;
  commits: CommitData[];
  loadingCommits: boolean;
  errorCommits: string;
  fetchCommits: () => void;
}

export default function CommitsHistoryPanel({
  theme,
  token,
  repoName,
  hasUser,
  commits,
  loadingCommits,
  errorCommits,
  fetchCommits,
}: CommitsHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4
          className={`text-[14px] font-sans font-medium flex items-center gap-2 ${
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          }`}
        >
          <GitCommit className="h-4.5 w-4.5 text-purple-400" />
          <span>Repository commits history</span>
        </h4>
        {repoName && token && hasUser && (
          <button
            type="button"
            onClick={() => fetchCommits()}
            disabled={loadingCommits}
            className={`p-1.5 rounded transition flex items-center justify-center cursor-pointer ${
              theme === "dark"
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200"
            }`}
            title="Refresh commits"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loadingCommits ? "animate-spin text-purple-400" : ""
              }`}
            />
          </button>
        )}
      </div>

      {!token || !repoName ? (
        <div
          className={`border border-dashed rounded-lg p-8 text-center text-[12px] font-sans font-normal ${
            theme === "dark"
              ? "border-slate-850 text-slate-500"
              : "border-slate-200 text-slate-450 bg-slate-50/50"
          }`}
        >
          Select a repository above to view commits.
        </div>
      ) : loadingCommits && commits.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <span
            className={`text-[12px] font-sans ml-2 ${
              theme === "dark" ? "text-slate-400" : "text-slate-650"
            }`}
          >
            Fetching latest repository commits...
          </span>
        </div>
      ) : errorCommits ? (
        <div
          className={`border rounded-lg p-4 flex items-start gap-2.5 ${
            theme === "dark"
              ? "border-red-950 bg-red-950/10 text-red-400"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="text-[12px] font-sans">
            <span className="font-semibold block">Failed to load commits</span>
            <span>{errorCommits}</span>
          </div>
        </div>
      ) : commits.length === 0 ? (
        <div
          className={`border border-dashed rounded-lg p-8 text-center text-[12px] font-sans font-normal ${
            theme === "dark"
              ? "border-slate-850 text-slate-500"
              : "border-slate-200 text-slate-450 bg-slate-50/50"
          }`}
        >
          No commits found in this repository.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {commits.map((c) => {
              const isExpanded = expandedId === c.sha;
              const commitDate = new Date(
                c.commit.author.date
              ).toLocaleString();
              const relativeTime = (() => {
                const ms =
                  Date.now() - new Date(c.commit.author.date).getTime();
                const mins = Math.floor(ms / 60000);
                if (mins < 1) return "just now";
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                return new Date(c.commit.author.date).toLocaleDateString();
              })();

              return (
                <m.div
                  key={c.sha}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  onClick={() => setExpandedId(isExpanded ? null : c.sha)}
                  className={`border rounded-lg p-3.5 cursor-pointer transition-colors select-none ${
                    isExpanded
                      ? theme === "dark"
                        ? "border-slate-700 bg-slate-900/60"
                        : "border-slate-300 bg-slate-100/50"
                      : theme === "dark"
                      ? "border-slate-850 bg-slate-950/20 hover:bg-slate-900/40"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.author?.avatar_url ? (
                        <img
                          src={c.author.avatar_url}
                          alt={c.commit.author.name}
                          className="w-5.5 h-5.5 rounded-full border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-5.5 h-5.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                            theme === "dark"
                              ? "bg-slate-800 text-slate-400"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.commit.author.name
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`font-medium truncate max-w-[120px] ${
                          theme === "dark"
                            ? "text-slate-300"
                            : "text-slate-800"
                        }`}
                      >
                        {c.author?.login || c.commit.author.name}
                      </span>
                      <span
                        className={`text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
                          theme === "dark"
                            ? "bg-slate-900 text-slate-550"
                            : "bg-slate-50 text-slate-450"
                        }`}
                      >
                        {c.sha.substring(0, 7)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 shrink-0">
                      <span>{relativeTime}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>

                  <div
                    className={`mt-2 text-[12.5px] font-sans font-medium line-clamp-2 pl-8 ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {c.commit.message}
                  </div>

                  {isExpanded && (
                    <div
                      className={`mt-3 pt-3 border-t pl-8 flex flex-col gap-2 ${
                        theme === "dark"
                          ? "border-slate-900"
                          : "border-slate-200"
                      }`}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>
                          SHA-1:{" "}
                          <strong className="text-slate-400">{c.sha}</strong>
                        </span>
                        <span>{commitDate}</span>
                      </div>
                      <div className="flex justify-end mt-1">
                        <a
                          href={c.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-[11.5px] font-sans font-medium transition ${
                            theme === "dark"
                              ? "text-purple-400 hover:text-purple-300"
                              : "text-purple-700 hover:text-purple-650"
                          }`}
                        >
                          <span>View on GitHub</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
