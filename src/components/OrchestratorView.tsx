import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Layers, Github, LogOut, FolderGit, Loader2, KeyRound, Search, Check, RefreshCw, GitCommit, ExternalLink, AlertCircle } from "lucide-react";
import { m, AnimatePresence } from "motion/react";

const getAgentColor = (route: string) => {
  const routeLower = route.toLowerCase();
  if (routeLower.includes("orchestrator")) return "text-purple-400 border-purple-500/20 bg-purple-500/5";
  if (routeLower.includes("doc") || routeLower.includes("readme")) return "text-teal-400 border-teal-500/20 bg-teal-500/5";
  if (routeLower.includes("knowledge") || routeLower.includes("rag")) return "text-blue-400 border-blue-500/20 bg-blue-500/5";
  if (routeLower.includes("cleaner") || routeLower.includes("ast")) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
  return "text-slate-400 border-slate-800 bg-slate-900/50";
};

const getAgentBadgeText = (route: string) => {
  const routeLower = route.toLowerCase();
  if (routeLower.includes("orchestrator")) return "orchestrator agent";
  if (routeLower.includes("doc") || routeLower.includes("readme")) return "documentation helper";
  if (routeLower.includes("knowledge") || routeLower.includes("rag")) return "knowledge base";
  if (routeLower.includes("cleaner") || routeLower.includes("ast")) return "cleaner agent";
  return "unknown specialist";
};

interface OrchestratorViewProps {
  theme: "light" | "dark";
  orchPayload: string;
  setOrchPayload: (val: string) => void;
  orchEventType: string;
  setOrchEventType: (val: string) => void;
  dispatchOrchEvent: () => void;
  orchResult: any;
  routingEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    payload: string;
    route: string;
    confidence: number;
    outcome: string;
    failed?: boolean;
  }>;
  repoName: string;
  setRepoName: (val: string) => void;
}

export default function OrchestratorView({
  theme,
  orchPayload,
  setOrchPayload,
  orchEventType,
  setOrchEventType,
  dispatchOrchEvent,
  orchResult,
  routingEvents,
  repoName,
  setRepoName
}: OrchestratorViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [token, setToken] = useState(() => localStorage.getItem("github_token") || "");
  const [inputToken, setInputToken] = useState("");
  const [ghUser, setGhUser] = useState<{ login: string; avatar_url: string } | null>(null);
  const [ghRepos, setGhRepos] = useState<Array<{ id: number; name: string; full_name: string }>>([]);
  const [loadingGh, setLoadingGh] = useState(false);
  const [errorGh, setErrorGh] = useState("");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [commits, setCommits] = useState<Array<{
    sha: string;
    commit: {
      author: { name: string; date: string };
      message: string;
    };
    author: { avatar_url: string; login: string } | null;
    html_url: string;
  }>>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [errorCommits, setErrorCommits] = useState("");

  const fetchCommits = async (selectedRepoName?: string) => {
    const targetRepo = selectedRepoName || repoName;
    if (!token || !targetRepo || !ghUser) {
      setCommits([]);
      return;
    }
    setLoadingCommits(true);
    setErrorCommits("");
    try {
      const selected = ghRepos.find(r => r.name === targetRepo);
      const fullName = selected ? selected.full_name : `${ghUser.login}/${targetRepo}`;
      const res = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=15`, {
        headers: { Authorization: `token ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch repository commits");
      const data = await res.json();
      setCommits(data);
    } catch (err: any) {
      setErrorCommits(err.message || "Failed to load commits");
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    if (token && repoName && ghUser && ghRepos.length > 0) {
      fetchCommits();
    } else {
      setCommits([]);
    }
  }, [repoName, token, ghUser, ghRepos, routingEvents]);

  const fetchGithubData = async (accessToken: string) => {
    setLoadingGh(true);
    setErrorGh("");
    try {
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${accessToken}` }
      });
      if (!userRes.ok) throw new Error("Invalid GitHub token");
      const userData = await userRes.json();
      
      const reposRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: { Authorization: `token ${accessToken}` }
      });
      if (!reposRes.ok) throw new Error("Failed to fetch repositories");
      const reposData = await reposRes.json();

      setGhUser({ login: userData.login, avatar_url: userData.avatar_url });
      setGhRepos(reposData);
      localStorage.setItem("github_token", accessToken);
      setToken(accessToken);
    } catch (err: any) {
      setErrorGh(err.message || "GitHub authorization failed");
      setGhUser(null);
      setGhRepos([]);
      localStorage.removeItem("github_token");
      setToken("");
    } finally {
      setLoadingGh(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchGithubData(token);
    }
  }, [token]);

  const handleConnect = () => {
    if (!inputToken.trim()) return;
    fetchGithubData(inputToken.trim());
  };

  const handleDisconnect = () => {
    localStorage.removeItem("github_token");
    setToken("");
    setGhUser(null);
    setGhRepos([]);
    setInputToken("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb row */}
      <div className={`text-[12px] font-mono tracking-tight flex items-center gap-1 ${
        theme === "dark" ? "text-slate-500" : "text-slate-400"
      }`}>
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-650"}>orchestrator</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-purple-400">eventRouting</span>
      </div>

      {/* Intro section */}
      <div>
        <h3 className={`text-[16px] font-sans font-medium flex items-center gap-2 ${
          theme === "dark" ? "text-white" : "text-slate-800"
        }`}>
          <Layers className="h-4.5 w-4.5 text-purple-400" />
          <span>Orchestrated event router</span>
        </h3>
        <p className={`text-[12px] mt-1 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>
          Evaluate unknown event payloads using direct patterns or large language model intelligence to dispatch specialist agents dynamically.
        </p>
      </div>

      {/* GitHub Repository Integration card */}
      {!ghUser ? (
        <div className={`rounded-xl p-4 md:p-5 flex flex-col gap-4 border ${
          theme === "dark" 
            ? "bg-slate-950/40 border-slate-850" 
            : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-[14px] font-sans font-medium flex items-center gap-2 ${
              theme === "dark" ? "text-slate-300" : "text-slate-850"
            }`}>
              <Github className="h-4 w-4 text-purple-400" />
              <span>GitHub repository integration</span>
            </h4>
            <span className={`text-[11px] font-mono ${
              theme === "dark" ? "text-slate-500" : "text-slate-400"
            }`}>Authentication required</span>
          </div>

          <div className="flex flex-col gap-3">
            <p className={`text-[12px] ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
              Connect your GitHub account to access your repositories. Use OAuth or enter a Personal Access Token manually.
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
                  onChange={(e) => setInputToken(e.target.value)}
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
      ) : (
        <div className={`rounded-xl p-4 md:p-5 flex flex-col gap-4 border ${
          theme === "dark" 
            ? "bg-slate-950/40 border-slate-850" 
            : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-[14px] font-sans font-medium flex items-center gap-2 ${
              theme === "dark" ? "text-slate-300" : "text-slate-850"
            }`}>
              <Github className="h-4 w-4 text-purple-400" />
              <span>GitHub repository integration</span>
            </h4>
            <button
              type="button"
              onClick={handleDisconnect}
              className={`transition flex items-center gap-1 text-[11px] font-sans cursor-pointer ${
                theme === "dark" ? "text-slate-500 hover:text-red-400" : "text-slate-400 hover:text-red-650"
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Disconnect</span>
            </button>
          </div>

          <div className={`flex flex-col md:flex-row items-center md:justify-between gap-4 bg-transparent border p-4.5 rounded-xl transition-all duration-250 ${
            theme === "dark"
              ? "border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
              : "border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.03)]"
          }`}>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <img
                src={ghUser.avatar_url}
                alt={ghUser.login}
                className={`w-9 h-9 rounded-full border ${
                  theme === "dark" ? "border-purple-500/30" : "border-purple-500/40"
                }`}
              />
              <div className="flex flex-col">
                <span className={`text-[12px] font-sans font-semibold ${
                  theme === "dark" ? "text-slate-200" : "text-slate-800"
                }`}>@{ghUser.login}</span>
                <span className={`text-[10px] font-mono ${
                  theme === "dark" ? "text-slate-500" : "text-slate-450"
                }`}>authenticated context</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full md:w-[260px] relative">
              <label className={`text-[10px] font-sans font-medium ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}>Target repository</label>

              {/* Custom dropdown trigger */}
              <button
                type="button"
                id="repo-select"
                onClick={() => { setRepoDropdownOpen(o => !o); setRepoSearch(""); }}
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
                <span className={`truncate ${
                  repoName
                    ? theme === "dark" ? "text-slate-100" : "text-slate-800"
                    : theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`}>
                  {repoName
                    ? ghRepos.find(r => r.name === repoName)?.full_name ?? repoName
                    : "Select repository..."}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  repoDropdownOpen ? "rotate-180 text-purple-400" : theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`} />
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
                    <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                      theme === "dark" ? "border-slate-800" : "border-slate-100"
                    }`}>
                      <Search className={`h-3.5 w-3.5 shrink-0 ${
                        theme === "dark" ? "text-slate-500" : "text-slate-400"
                      }`} />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search repos..."
                        value={repoSearch}
                        onChange={e => setRepoSearch(e.target.value)}
                        className={`w-full text-[12px] font-sans bg-transparent outline-none ${
                          theme === "dark"
                            ? "text-slate-200 placeholder-slate-600"
                            : "text-slate-800 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                      {ghRepos
                        .filter(r =>
                          r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
                        )
                        .length === 0 ? (
                          <div className={`px-4 py-3 text-[12px] text-center ${
                            theme === "dark" ? "text-slate-500" : "text-slate-400"
                          }`}>
                            No repos match "{repoSearch}"
                          </div>
                        ) : (
                          ghRepos
                            .filter(r =>
                              r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
                            )
                            .map(repo => {
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
                                        : "bg-purple-50 text-purple-700"
                                      : theme === "dark"
                                        ? "text-slate-300 hover:bg-slate-800"
                                        : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate font-medium">{repo.full_name}</span>
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

          <div className={`text-[11px] font-mono pl-1 flex items-center gap-1.5 ${
            theme === "dark" ? "text-slate-500" : "text-slate-450"
          }`}>
            <FolderGit className="h-3.5 w-3.5 text-teal-400" />
            <span>Active context: <strong className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>{repoName || "None selected"}</strong></span>
          </div>
        </div>
      )}

      {/* GitHub Repository Commits */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className={`text-[14px] font-sans font-medium flex items-center gap-2 ${
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          }`}>
            <GitCommit className="h-4.5 w-4.5 text-purple-400" />
            <span>Repository commits history</span>
          </h4>
          {repoName && token && ghUser && (
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
              <RefreshCw className={`h-3.5 w-3.5 ${loadingCommits ? "animate-spin text-purple-400" : ""}`} />
            </button>
          )}
        </div>

        {!token || !repoName ? (
          <div className={`border border-dashed rounded-lg p-8 text-center text-[12px] font-sans font-normal ${
            theme === "dark"
              ? "border-slate-850 text-slate-500"
              : "border-slate-200 text-slate-450 bg-slate-50/50"
          }`}>
            Select a repository above to view commits.
          </div>
        ) : loadingCommits && commits.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            <span className={`text-[12px] font-sans ml-2 ${
              theme === "dark" ? "text-slate-400" : "text-slate-650"
            }`}>Fetching latest repository commits...</span>
          </div>
        ) : errorCommits ? (
          <div className={`border rounded-lg p-4 flex items-start gap-2.5 ${
            theme === "dark"
              ? "border-red-950 bg-red-950/10 text-red-400"
              : "border-red-100 bg-red-50 text-red-700"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-[12px] font-sans">
              <span className="font-semibold block">Failed to load commits</span>
              <span>{errorCommits}</span>
            </div>
          </div>
        ) : commits.length === 0 ? (
          <div className={`border border-dashed rounded-lg p-8 text-center text-[12px] font-sans font-normal ${
            theme === "dark"
              ? "border-slate-850 text-slate-500"
              : "border-slate-200 text-slate-450 bg-slate-50/50"
          }`}>
            No commits found in this repository.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {commits.map((c) => {
                const isExpanded = expandedId === c.sha;
                const commitDate = new Date(c.commit.author.date).toLocaleString();
                const relativeTime = (() => {
                  const ms = Date.now() - new Date(c.commit.author.date).getTime();
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
                          <div className={`w-5.5 h-5.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                            theme === "dark" ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                          }`}>
                            {c.commit.author.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-medium truncate max-w-[120px] ${
                          theme === "dark" ? "text-slate-300" : "text-slate-800"
                        }`}>
                          {c.author?.login || c.commit.author.name}
                        </span>
                        <span className={`text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
                          theme === "dark" ? "bg-slate-900 text-slate-550" : "bg-slate-50 text-slate-450"
                        }`}>
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

                    <div className={`mt-2 text-[12.5px] font-sans font-medium line-clamp-2 pl-8 ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}>
                      {c.commit.message}
                    </div>

                    {isExpanded && (
                      <div 
                        className={`mt-3 pt-3 border-t pl-8 flex flex-col gap-2 ${
                          theme === "dark" ? "border-slate-900" : "border-slate-200"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>SHA-1: <strong className="text-slate-400">{c.sha}</strong></span>
                          <span>{commitDate}</span>
                        </div>
                        <div className="flex justify-end mt-1">
                          <a
                            href={c.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 text-[11.5px] font-sans font-medium transition ${
                              theme === "dark" ? "text-purple-400 hover:text-purple-300" : "text-purple-700 hover:text-purple-650"
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
    </div>
  );
}
