import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Layers, Github, LogOut, FolderGit, Loader2, KeyRound } from "lucide-react";
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

            <div className="flex flex-col gap-1 w-full md:w-[250px]">
              <label htmlFor="repo-select" className={`text-[10px] font-sans font-medium ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}>Target repository</label>
              <select
                id="repo-select"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className={`border rounded-lg text-[12px] font-sans font-normal p-2.5 outline-none focus:border-purple-500 transition cursor-pointer ${
                  theme === "dark"
                    ? "bg-slate-950 border-slate-800 text-slate-200"
                    : "bg-white border-slate-200 text-slate-850"
                }`}
              >
                <option value="" disabled>Select repository...</option>
                {ghRepos.map((repo) => (
                  <option key={repo.id} value={repo.name}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
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

      {/* Live Routing Timeline */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className={`text-[14px] font-sans font-medium ${
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          }`}>
            Routing timeline
          </h4>
          <span className={`text-[12px] font-mono ${
            theme === "dark" ? "text-slate-500" : "text-slate-400"
          }`}>Autonomous loop active</span>
        </div>

        {routingEvents.length === 0 ? (
          <div className={`border border-dashed rounded-lg p-8 text-center text-[12px] font-sans font-normal ${
            theme === "dark"
              ? "border-slate-850 text-slate-500"
              : "border-slate-200 text-slate-450 bg-slate-50/50"
          }`}>
            No events routed yet. CodeLore is listening.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {routingEvents.map((ev) => {
                const isExpanded = expandedId === ev.id;
                const cardColor = getAgentColor(ev.route);
                
                return (
                  <m.div
                    key={ev.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors select-none ${
                      ev.failed 
                        ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10" 
                        : isExpanded 
                          ? theme === "dark"
                            ? "border-slate-700 bg-slate-900/60" 
                            : "border-slate-300 bg-slate-100/50"
                          : theme === "dark"
                            ? "border-slate-850 bg-slate-950/20 hover:bg-slate-900/40"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500">{ev.timestamp}</span>
                        <span className={`font-mono px-2 py-0.5 rounded text-[11px] ${
                          theme === "dark" ? "bg-slate-850 text-slate-400" : "bg-slate-105 text-slate-600"
                        } capitalize`}>
                          {ev.eventType}
                        </span>
                        
                        {!ev.failed ? (
                          <span className={`font-mono border px-2 py-0.5 rounded text-[10px] ${cardColor}`}>
                            {getAgentBadgeText(ev.route)}
                          </span>
                        ) : (
                          <span className="font-mono border border-red-500/20 bg-red-500/5 text-red-400 px-2 py-0.5 rounded text-[10px]">
                            Route failure
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.confidence > 0 && (
                          <span className="font-mono text-slate-500 text-[11px]">
                            Confidence {(ev.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    <div className={`mt-2 text-[12px] font-sans font-normal truncate pl-1 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>
                      {ev.payload}
                    </div>

                    <div className={`mt-1.5 text-[11px] font-mono tracking-tight pl-1 flex items-center gap-1.5 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-450"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>{ev.outcome}</span>
                      {ev.failed && (
                        <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          invalid schema specification
                        </span>
                      )}
                    </div>

                    {/* Expanded JSON details */}
                    {isExpanded && (
                      <div 
                        className={`mt-3 pt-3 border-t ${
                          theme === "dark" ? "border-slate-900" : "border-slate-200"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
                          Standard output payload contract
                        </span>
                        <pre className={`border p-2.5 rounded text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed ${
                          theme === "dark"
                            ? "bg-slate-950 border-slate-900 text-slate-300"
                            : "bg-slate-50 border-slate-200 text-slate-750"
                        }`}>
                          {JSON.stringify(
                            {
                              id: ev.id,
                              timestamp: ev.timestamp,
                              eventType: ev.eventType,
                              payload: ev.payload,
                              targetAgent: ev.route,
                              routeConfidence: ev.confidence,
                              resolvedOutcome: ev.outcome,
                              systemLog: ev.failed ? "payload format failed basic structural parser check" : "completed specialist synchronization"
                            },
                            null,
                            2
                          )}
                        </pre>
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
