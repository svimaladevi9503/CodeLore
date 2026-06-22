import React, { useState } from "react";
import {
  ChevronDown,
  Github,
  LogOut,
  FolderGit,
  Loader2,
  KeyRound,
  Search,
  Check,
} from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { GitHubUser, GitHubRepo } from "./useGitHub";

interface GitHubIntegrationCardProps {
  theme: "light" | "dark";
  token: string;
  inputToken: string;
  setInputToken: (val: string) => void;
  loadingGh: boolean;
  errorGh: string;
  ghUser: GitHubUser | null;
  ghRepos: GitHubRepo[];
  repoName: string;
  setRepoName: (val: string) => void;
  handleConnect: () => void;
  handleDisconnect: () => void;
}

export default function GitHubIntegrationCard({
  theme,
  token,
  inputToken,
  setInputToken,
  loadingGh,
  errorGh,
  ghUser,
  ghRepos,
  repoName,
  setRepoName,
  handleConnect,
  handleDisconnect,
}: GitHubIntegrationCardProps) {
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");

  if (!ghUser) {
    return (
      <div
        className={`rounded-xl p-4 md:p-5 flex flex-col gap-4 border ${
          theme === "dark"
            ? "bg-slate-950/40 border-slate-850"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <h4
            className={`text-[14px] font-sans font-medium flex items-center gap-2 ${
              theme === "dark" ? "text-slate-300" : "text-slate-850"
            }`}
          >
            <Github className="h-4 w-4 text-purple-400" />
            <span>GitHub repository integration</span>
          </h4>
          <span
            className={`text-[11px] font-mono ${
              theme === "dark" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Authentication required
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <p
            className={`text-[12px] ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Connect your GitHub account to access your repositories. Use OAuth
            or enter a Personal Access Token manually.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/api/github/login"
              className={`px-4 py-2.5 rounded-lg font-sans text-[12px] font-medium cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition w-full sm:w-auto shadow-sm border ${
                theme === "dark"
                  ? "bg-slate-900 border-purple-500/80 hover:bg-slate-850 text-purple-300"
                  : "bg-white border-purple-500/80 hover:bg-purple-50/50 text-purple-700"
              }`}
            >
              <Github className="h-3.5 w-3.5 text-purple-600" />
              <span>Sign in with GitHub OAuth</span>
            </a>

            <div className="flex-1 flex gap-2">
              <input
                type="password"
                placeholder="Or enter Personal Access Token..."
                value={inputToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputToken(e.target.value)}
                className={`flex-1 border rounded-lg text-[12px] font-sans font-normal p-2.5 outline-none focus:border-purple-500 transition ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-600"
                    : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={handleConnect}
                disabled={loadingGh}
                className={`px-4 py-2.5 rounded-lg font-sans text-[12px] font-medium cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-sm border ${
                  theme === "dark"
                    ? "bg-slate-900 border-teal-500/80 hover:bg-slate-850 text-teal-300"
                    : "bg-white border-teal-500/80 hover:bg-teal-50/50 text-teal-700"
                }`}
              >
                {loadingGh ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5 text-teal-600" />
                )}
                <span>Connect</span>
              </button>
            </div>
          </div>
          {errorGh && (
            <p className="text-[11px] text-red-400 mt-1 font-sans">{errorGh}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 md:p-5 flex flex-col gap-4 border ${
        theme === "dark"
          ? "bg-slate-950/40 border-slate-850"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <h4
          className={`text-[14px] font-sans font-medium flex items-center gap-2 ${
            theme === "dark" ? "text-slate-300" : "text-slate-850"
          }`}
        >
          <Github className="h-4 w-4 text-purple-400" />
          <span>GitHub repository integration</span>
        </h4>
        <button
          type="button"
          onClick={handleDisconnect}
          className={`transition flex items-center gap-1 text-[11px] font-sans cursor-pointer ${
            theme === "dark"
              ? "text-slate-500 hover:text-red-400"
              : "text-slate-400 hover:text-red-650"
          }`}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Disconnect</span>
        </button>
      </div>

      <div
        className={`flex flex-col md:flex-row items-center md:justify-between gap-4 bg-transparent border p-4.5 rounded-xl transition-all duration-250 ${
          theme === "dark"
            ? "border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
            : "border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.03)]"
        }`}
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          <img
            src={ghUser.avatar_url}
            alt={ghUser.login}
            className={`w-9 h-9 rounded-full border ${
              theme === "dark"
                ? "border-purple-500/30"
                : "border-purple-500/40"
            }`}
          />
          <div className="flex flex-col">
            <span
              className={`text-[12px] font-sans font-semibold ${
                theme === "dark" ? "text-slate-200" : "text-slate-800"
              }`}
            >
              @{ghUser.login}
            </span>
            <span
              className={`text-[10px] font-mono ${
                theme === "dark" ? "text-slate-500" : "text-slate-450"
              }`}
            >
              authenticated context
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full md:w-[260px] relative">
          <label
            className={`text-[10px] font-sans font-medium ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Target repository
          </label>

          {/* Custom dropdown trigger */}
          <button
            type="button"
            id="repo-select"
            onClick={() => {
              setRepoDropdownOpen((o: boolean) => !o);
              setRepoSearch("");
            }}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-[12px] font-sans font-normal cursor-pointer transition-all outline-none w-full ${
              repoDropdownOpen
                ? theme === "dark"
                  ? "border-purple-500 bg-slate-900"
                  : "border-purple-500 bg-white"
                : theme === "dark"
                ? "border-slate-800 bg-slate-950 hover:border-slate-700"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span
              className={`truncate ${
                repoName
                  ? theme === "dark"
                    ? "text-slate-100"
                    : "text-slate-800"
                  : theme === "dark"
                  ? "text-slate-500"
                  : "text-slate-400"
              }`}
            >
              {repoName
                ? ghRepos.find((r) => r.name === repoName)?.full_name ?? repoName
                : "Select repository..."}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                repoDropdownOpen
                  ? "rotate-180 text-purple-400"
                  : theme === "dark"
                  ? "text-slate-500"
                  : "text-slate-400"
              }`}
            />
          </button>

          {/* Dropdown panel */}
          <AnimatePresence>
            {repoDropdownOpen && (
              <m.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border overflow-hidden shadow-2xl ${
                  theme === "dark"
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-slate-200"
                }`}
                style={{ maxHeight: 260 }}
              >
                {/* Search input */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 border-b ${
                    theme === "dark" ? "border-slate-800" : "border-slate-100"
                  }`}
                >
                  <Search
                    className={`h-3.5 w-3.5 shrink-0 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                    }`}
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search repos..."
                    value={repoSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoSearch(e.target.value)}
                    className={`w-full text-[12px] font-sans bg-transparent outline-none ${
                      theme === "dark"
                        ? "text-slate-200 placeholder-slate-600"
                        : "text-slate-800 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Options list */}
                <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                  {ghRepos.filter((r) =>
                    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
                  ).length === 0 ? (
                    <div
                      className={`px-4 py-3 text-[12px] text-center ${
                        theme === "dark" ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      No repos match "{repoSearch}"
                    </div>
                  ) : (
                    ghRepos
                      .filter((r) =>
                        r.full_name
                          .toLowerCase()
                          .includes(repoSearch.toLowerCase())
                      )
                      .map((repo) => {
                        const isSelected = repoName === repo.name;
                        return (
                          <button
                            key={repo.id}
                            type="button"
                            onClick={() => {
                              setRepoName(repo.name);
                              setRepoDropdownOpen(false);
                              setRepoSearch("");
                            }}
                            className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 text-[12px] font-sans transition-colors cursor-pointer ${
                              isSelected
                                ? theme === "dark"
                                  ? "bg-purple-500/10 text-purple-300"
                                  : "bg-purple-550/10 text-purple-700" // changed bg-purple-50 to match bg-purple-550/10 or keep original
                                : theme === "dark"
                                ? "text-slate-300 hover:bg-slate-850"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-medium">
                                {repo.full_name}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                            )}
                          </button>
                        );
                      })
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        className={`text-[11px] font-mono pl-1 flex items-center gap-1.5 ${
          theme === "dark" ? "text-slate-500" : "text-slate-450"
        }`}
      >
        <FolderGit className="h-3.5 w-3.5 text-teal-400" />
        <span>
          Active context:{" "}
          <strong
            className={theme === "dark" ? "text-slate-300" : "text-slate-700"}
          >
            {repoName || "None selected"}
          </strong>
        </span>
      </div>
    </div>
  );
}
