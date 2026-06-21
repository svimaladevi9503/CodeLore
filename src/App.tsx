import React, { useState, useEffect } from "react";
import { 
  GitBranch, GitPullRequest, Search, Terminal, Play, CheckCircle, AlertCircle, 
  Trash2, FileText, Database, ShieldAlert, Cpu, Check, HelpCircle, ArrowRight, 
  BookOpen, CodeXml, RefreshCw, Layers, PlusCircle, ExternalLink, 
  FileCheck, Sparkles, X, ChevronRight, Layers3, Activity, ArrowUpRight,
  Sun, Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SystemInfo, ParcleRecord, ScanIssue, WebhookResult } from "./types";

// Import modular subcomponents 3 panel workspace
import OrchestratorView from "./components/OrchestratorView";
import DocHelperView from "./components/DocHelperView";
import KnowledgeBaseView from "./components/KnowledgeBaseView";
import CleanerAgentView from "./components/CleanerAgentView";
import VaultPanel from "./components/VaultPanel";

export default function App() {
  // Navigation & View States: orchestrator, docs, kb, cleaner
  const [activeTab, setActiveTab] = useState<"overview" | "orchestrator" | "docs" | "kb" | "cleaner" | "parcle">("orchestrator");

  // Theme State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  // Backend Data States
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [parcleData, setParcleData] = useState<ParcleRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Orchestrator Playground State
  const [orchPayload, setOrchPayload] = useState<string>("");
  const [orchEventType, setOrchEventType] = useState<string>("unknown");
  const [orchResult, setOrchResult] = useState<any>(null);
  
  // Webhook Simulation State
  const [commitAuthor, setCommitAuthor] = useState<string>("github-expert");
  const [repoName, setRepoName] = useState<string>("Parcle-sync");
  const [commitMessage, setCommitMessage] = useState<string>("fix: integrate standard real-time event pipeline for sensor feeds");
  const [testDiff, setTestDiff] = useState<string>(
    `diff --git a/src/pipeline.ts b/src/pipeline.ts
index c92b8d1..db3d6a2 105655
--- a/src/pipeline.ts
+++ b/src/pipeline.ts
@@ -10,3 +10,12 @@ export function startIngress() {
   console.log("Telemetry channel active");
+  // Added dynamic retry mechanism for robust telemetry collection
+  setInterval(() => {
+    if (isChannelBroken()) {
+      reconnectChannel();
+    }
+  }, 5000);
+}`
   );
   const [isPushing, setIsPushing] = useState<boolean>(false);
   const [pendingWebhook, setPendingWebhook] = useState<WebhookResult | null>(null);
   const [customDraftContent, setCustomDraftContent] = useState<string>("");

  // RAG / Chatbot States
  const [userQuery, setUserQuery] = useState<string>("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "agent"; text: string; sources?: any[]; timestamp: string }>>([
    {
      sender: "agent",
      text: "Hello! I am the Knowledge Base RAG Specialist. Ask me any conceptual or operational questions about the codebase.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // New Knowledge Chunk Form States
  const [newChunkFile, setNewChunkFile] = useState<string>("api_endpoints.md");
  const [newChunkSection, setNewChunkSection] = useState<string>("Authentication Headers");
  const [newChunkContent, setNewChunkContent] = useState<string>("All requests to our microservice gate require signature matching inside headers.");
  const [chunkAddSuccess, setChunkAddSuccess] = useState<boolean>(false);

  // Cleaner States
  const [cleanerCode, setCleanerCode] = useState<string>(
    `import { useState, useEffect } from 'react';
import { Sparkles, Terminal } from 'lucide-react'; // Unused Sparkles import

export default function Sandbox() {
  const [active, setActive] = useState(true);
  const unusedCounter = 42; // Unused variable
  const activeMessage = "Workspace loaded";

  useEffect(() => {
    console.log("AST scan candidate is online");
  }, []);

  return (
    <div className="p-4 bg-slate-900 border border-slate-705">
      <h3 className="text-white text-md font-sans">AST Test Area</h3>
      <p className="text-xs text-slate-400">{activeMessage}</p>
    </div>
  );
}`
  );
  const [scanWholeWorkspace, setScanWholeWorkspace] = useState<boolean>(false);
  const [autoApplyPatch, setAutoApplyPatch] = useState<boolean>(false);
  const [scannedIssues, setScannedIssues] = useState<ScanIssue[]>([]);
  const [scannedPatchId, setScannedPatchId] = useState<string>("");
  const [scannedPatchText, setScannedPatchText] = useState<string>("");
  const [cleanerLoading, setCleanerLoading] = useState<boolean>(false);
  const [isPatchApplied, setIsPatchApplied] = useState<boolean>(false);

  // Pipeline Runs States
  const [pipelineRunning, setPipelineRunning] = useState<boolean>(false);
  const [lastPipelineResult, setLastPipelineResult] = useState<any>(null);

  // Micro-interaction States
  const [docHelperStage, setDocHelperStage] = useState<"idle" | "writing" | "opening_pr" | "pr_opened">("idle");
  const [streamedText, setStreamedText] = useState<string>("");
  const [renderedIssues, setRenderedIssues] = useState<ScanIssue[]>([]);
  const [activeCitationText, setActiveCitationText] = useState<string | null>(null);
  const [historicDiffOverlay, setHistoricDiffOverlay] = useState<{
    open: boolean;
    oldContent: string;
    newContent: string;
    sha: string;
  } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [vaultOpenOnMobile, setVaultOpenOnMobile] = useState<boolean>(false);

  const [routingEvents, setRoutingEvents] = useState<Array<{
    id: string;
    timestamp: string;
    eventType: string;
    payload: string;
    route: string;
    confidence: number;
    outcome: string;
    failed?: boolean;
  }>>([
    {
      id: "e1",
      timestamp: "02:08:41",
      eventType: "git commit",
      payload: "fix: solve ast unused identifier scan loops dynamically",
      route: "DOCUMENTATION HELPER",
      confidence: 0.98,
      outcome: "Readme draft written and registered in Parcle history successfully"
    },
    {
      id: "e2",
      timestamp: "01:54:12",
      eventType: "chat query",
      payload: "how do i configure the parcle storage memory adapter?",
      route: "KNOWLEDGE BASE AGENT",
      confidence: 0.95,
      outcome: "Rag lookup returned high confidence answer with 2 cited source chunks"
    },
    {
      id: "e3",
      timestamp: "01:45:30",
      eventType: "scan",
      payload: "static ast integrity testing on server.ts",
      route: "CLEANER AGENT",
      confidence: 0.99,
      outcome: "Ast scan resolved 2 unused identifiers and generated unified diff patch"
    }
  ]);

  // Sync routingEvents when orchResult changes
  useEffect(() => {
    if (orchResult) {
      const isFailed = orchResult.status === "failed";
      const newEvent = {
        id: `e_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        eventType: orchEventType === "unknown" ? "ambiguous event" : orchEventType,
        payload: orchPayload || "Empty system payload details",
        route: orchResult.agent || "UNKNOWN",
        confidence: orchResult.result?.classification?.confidence ?? (isFailed ? 0.35 : 0.85),
        outcome: orchResult.status === "success" 
          ? "Routed successfully to target specialist" 
          : "Heuristic classification fallback resolved",
        failed: isFailed
      };
      setRoutingEvents(prev => [newEvent, ...prev]);
    }
  }, [orchResult]);

  // Sync typewriter stream for Doc Helper
  useEffect(() => {
    if (pendingWebhook?.newReadme) {
      setStreamedText("");
      let idx = 0;
      const fullText = pendingWebhook.newReadme;
      const interval = setInterval(() => {
        if (idx < fullText.length) {
          setStreamedText(fullText.substring(0, idx + 8));
          idx += 8;
        } else {
          clearInterval(interval);
        }
      }, 15);
      return () => clearInterval(interval);
    } else {
      setStreamedText("");
    }
  }, [pendingWebhook]);

  // Sync progressive issue highlighting
  useEffect(() => {
    if (scannedIssues.length > 0) {
      setRenderedIssues([]);
      scannedIssues.forEach((issue, index) => {
        setTimeout(() => {
          setRenderedIssues(prev => [...prev, issue]);
        }, (index + 1) * 350);
      });
    } else {
      setRenderedIssues([]);
    }
  }, [scannedIssues]);

  // Fetch metrics and records
  const fetchDiagnostics = async () => {
    try {
      const infoRes = await fetch("/api/sys-info");
      const infoData = await infoRes.json();
      setSysInfo(infoData);

      const recRes = await fetch("/api/parcle/records");
      const recData = await recRes.json();
      setParcleData(recData.records);
    } catch (err) {
      console.error("Diagnostic grab error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  // Run Orchestrator Sandbox Dispatcher
  const dispatchOrchEvent = async () => {
    if (!orchPayload.trim()) return;
    try {
      setOrchResult(null);
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: orchEventType, payload: orchPayload })
      });
      const data = await res.json();
      setOrchResult(data);
      fetchDiagnostics();
    } catch (err) {
      console.error("Orchestrator failure:", err);
    }
  };

  // Trigger push webhook (Documentation Helper)
  const triggerPushWebhook = async () => {
    setIsPushing(true);
    setDocHelperStage("writing");
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitHistory: `Commit summary: ${commitMessage}\n\n${testDiff}`,
          repoName,
          author: commitAuthor
        })
      });
      const data = await res.json();
      if (data.status === "pending_approval") {
        setPendingWebhook(data.result);
        setCustomDraftContent(data.result.newReadme);
        setDocHelperStage("opening_pr");
      }
    } catch (err) {
      console.error("Webhook push failed:", err);
      setDocHelperStage("idle");
    } finally {
      setIsPushing(false);
    }
  };

  // Submit approved draft
  const approveReadmeRevision = async () => {
    if (!pendingWebhook) return;
    try {
      const res = await fetch("/api/approve-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sha: pendingWebhook.sha,
          content: customDraftContent,
          author: pendingWebhook.author,
          oldContent: pendingWebhook.oldReadme
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setDocHelperStage("pr_opened");
        setTimeout(() => {
          setPendingWebhook(null);
          setDocHelperStage("idle");
        }, 4000);
        fetchDiagnostics();
      }
    } catch (err) {
      console.error("Draft approval failed:", err);
    }
  };

  // Run KB Query (RAG)
  const queryKnowledgeBase = async () => {
    if (!userQuery.trim()) return;
    
    const userMsg = { sender: "user" as const, text: userQuery, timestamp: new Date().toLocaleTimeString() };
    setChatLog(prev => [...prev, userMsg]);
    setChatLoading(true);
    const qTemp = userQuery;
    setUserQuery("");

    try {
      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: qTemp })
      });
      const data = await res.json();
      
      const agentMsg = {
        sender: "agent" as const,
        text: data.result.answer,
        sources: data.result.sources,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatLog(prev => [...prev, agentMsg]);
      fetchDiagnostics();
    } catch (err) {
      console.error("KB query error:", err);
    } finally {
      setChatLoading(false);
    }
  };

  // Add custom layout chunk to Parcle
  const addNewKnowledgeChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChunkContent.trim() || !newChunkFile.trim()) return;
    try {
      const res = await fetch("/api/rag/add-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: newChunkFile,
          section: newChunkSection,
          content: newChunkContent
        })
      });
      if (res.ok) {
        setNewChunkContent("");
        setChunkAddSuccess(true);
        setTimeout(() => setChunkAddSuccess(false), 3000);
        fetchDiagnostics();
      }
    } catch (err) {
      console.error("Add chunk fail:", err);
    }
  };

  // Execute Code Cleaner Scan
  const triggerCleanerScan = async () => {
    setCleanerLoading(true);
    setIsPatchApplied(false);
    try {
      const res = await fetch("/api/clean/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanerCode,
          scanWholeWorkspace
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setScannedIssues(data.result.issues);
        setScannedPatchId(data.result.patch_id);
        setScannedPatchText(data.result.patch);
        fetchDiagnostics();

        if (autoApplyPatch && data.result.patch_id) {
          await applyCleanerPatch(data.result.patch_id);
        }
      }
    } catch (err) {
      console.error("Cleaner execution error:", err);
    } finally {
      setCleanerLoading(false);
    }
  };

  // Apply Cleaner Patch
  const applyCleanerPatch = async (forcedPatchId?: string) => {
    const pId = typeof forcedPatchId === "string" ? forcedPatchId : scannedPatchId;
    if (!pId) return;
    try {
      const res = await fetch("/api/clean/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patchId: pId })
      });
      const data = await res.json();
      if (data.status === "success") {
        setIsPatchApplied(true);
        setScannedIssues([]);
        fetchDiagnostics();
      }
    } catch (err) {
      console.error("Apply patch fail:", err);
    }
  };

  // Trigger testing pipeline runs
  const runPipelineCheck = async () => {
    setPipelineRunning(true);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CI Pipeline standard verification" })
      });
      const data = await res.json();
      setLastPipelineResult(data);
      fetchDiagnostics();
    } catch (err) {
      console.error("Pipeline query failed:", err);
    } finally {
      setPipelineRunning(false);
    }
  };

  // Render the agent states for top bar health metrics
  const getAgentDotStyle = (active: boolean, err = false) => {
    if (err) return "bg-red-400";
    return active ? "bg-emerald-400 animate-pulse-dot" : "bg-slate-500";
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col antialiased transition-colors duration-250 ${
      theme === "dark" 
        ? "bg-[#070b13] text-slate-100" 
        : "light-mode bg-[#f8fafc] text-slate-800"
    }`}>
      
      {/* ----------------- TOP BAR ----------------- */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-40 px-6 py-3 flex items-center justify-between shrink-0 transition-all duration-250 ${
        theme === "dark" 
          ? "border-slate-800/80 bg-slate-950/80" 
          : "border-slate-200 bg-[#f8fafc]/95"
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 100 100"
              className="w-7 h-7 select-none shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Hexagon */}
              <polygon 
                points="50,5 90,28 90,72 50,95 10,72 10,28" 
                stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
                strokeWidth="2.8" 
                strokeLinejoin="round"
                strokeOpacity="1.0"
              />

              {/* Inner Hub Hexagon */}
              <polygon 
                points="50,21 75,35 75,65 50,79 25,65 25,35" 
                stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
                strokeWidth="1.2" 
                strokeLinejoin="round"
                strokeOpacity="0.45"
              />

              {/* Spokes (Outer vertices to Inner vertices) */}
              <line x1="50" y1="5" x2="50" y2="21" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
              <line x1="90" y1="28" x2="75" y2="35" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
              <line x1="90" y1="72" x2="75" y2="65" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
              <line x1="50" y1="95" x2="50" y2="79" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
              <line x1="10" y1="72" x2="25" y2="65" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
              <line x1="10" y1="28" x2="25" y2="35" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />

              {/* Crystalline facets (Diagonals) */}
              <line x1="50" y1="21" x2="10" y2="28" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />
              <line x1="50" y1="21" x2="90" y2="28" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />
              
              <line x1="25" y1="35" x2="10" y2="72" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />
              <line x1="75" y1="35" x2="90" y2="72" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />
              <line x1="25" y1="65" x2="10" y2="28" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />
              <line x1="75" y1="65" x2="90" y2="28" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />

              <line x1="50" y1="79" x2="10" y2="72" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />
              <line x1="50" y1="79" x2="90" y2="72" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.35" />

              <line x1="50" y1="5" x2="25" y2="35" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.3" />
              <line x1="50" y1="5" x2="75" y2="35" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.3" />
              <line x1="50" y1="95" x2="25" y2="65" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.3" />
              <line x1="50" y1="95" x2="75" y2="65" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1" strokeOpacity="0.3" />

              {/* Stylized Core "C" and "L" letters */}
              {/* Letter C */}
              <path 
                d="M 45,34 L 32,41 L 32,59 L 45,66" 
                stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              
              {/* Letter L */}
              <path 
                d="M 55,34 L 55,59 L 68,52" 
                stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
                strokeWidth="4.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <span className={`text-[21px] font-sans font-semibold tracking-tight leading-none select-none ${theme === "dark" ? "text-white" : "text-[#024D33]"}`}>
              CodeLore
            </span>
            <span className={`text-[12px] font-mono font-normal pl-2.5 border-l select-none leading-none ${
              theme === "dark" ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-300"
            }`}>
              repo: custom-docs
            </span>
          </div>
          <span className={`text-[11px] font-mono font-normal px-2 py-0.5 rounded select-none border transition-colors duration-250 ${
            theme === "dark"
              ? "text-slate-400 bg-slate-900 border-slate-800"
              : "text-[#024D33] bg-[#eef3f1] border-emerald-200"
          }`}>
            main
          </span>
        </div>

        {/* 4 Agent Health Indicators in Center (Never color alone) */}
        <div className="hidden md:flex items-center gap-6 text-[12.5px] font-mono select-none">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getAgentDotStyle(orchResult !== null)}`} />
            <span className={theme === "dark" ? "text-slate-450" : "text-slate-600"}>orchestrator: <span className="font-semibold text-slate-500">{orchResult !== null ? "thinking" : "idle"}</span></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getAgentDotStyle(docHelperStage !== "idle")}`} />
            <span className={theme === "dark" ? "text-slate-450" : "text-slate-600"}>docs: <span className="font-semibold text-slate-500">{docHelperStage !== "idle" ? docHelperStage : "idle"}</span></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getAgentDotStyle(chatLoading)}`} />
            <span className={theme === "dark" ? "text-slate-450" : "text-slate-600"}>rag agent: <span className="font-semibold text-slate-500">{chatLoading ? "querying" : "idle"}</span></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${getAgentDotStyle(cleanerLoading)}`} />
            <span className={theme === "dark" ? "text-slate-450" : "text-slate-600"}>cleaner: <span className="font-semibold text-slate-500">{cleanerLoading ? "scanning" : "idle"}</span></span>
          </div>
        </div>

        {/* Right tools (Status, sync status, theme triggers) */}
        <div className="flex items-center gap-4">
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] transition cursor-pointer font-sans font-medium border ${
              theme === "dark"
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#024D33]"
            }`}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-sans font-medium text-amber-500">Light mode</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-sky-500" />
                <span className="font-sans font-medium text-slate-600">Dark mode</span>
              </>
            )}
          </button>

          <span className={`text-[12px] font-mono hidden sm:block ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            git sync: active
          </span>
        </div>
      </header>

      {/* ----------------- LAYOUT 3 PANEL WORKSPACE ----------------- */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* --- LEFT PANEL: Agent Lens (200px) --- */}
        <aside className="lg:w-[200px] shrink-0 flex flex-col gap-3 select-none">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-1.5">
            <h3 className="text-[14px] font-sans font-medium text-slate-400">Agent Lens</h3>
            <span className="text-[12px] font-mono text-slate-500">4 stack</span>
          </div>

          {/* Sits 4 agents stacked vertically */}
          <div className="flex flex-col gap-2.5">
            
            {/* Agent Card 1: Orchestrator */}
            <button
              onClick={() => setActiveTab("orchestrator")}
              className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                activeTab === "orchestrator"
                  ? "bg-purple-500/5 border-purple-500 text-white"
                  : "bg-transparent border-slate-900 text-slate-400 hover:bg-slate-900/40"
              }`}
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500 rounded-l" />
              <div className="flex items-center gap-2 pl-1">
                <Cpu className={`h-4.5 w-4.5 ${activeTab === "orchestrator" ? "text-purple-400" : "text-slate-500"}`} />
                <span className="text-[14px] font-sans font-medium capitalize">orchestrator</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] pl-1 text-slate-500 font-mono">
                <span>{orchResult ? "thinking" : "idle"}</span>
                <span>Active now</span>
              </div>
              <div className="mt-1.5 text-[12px] text-slate-500 font-mono truncate pl-1 border-t border-slate-900/30 pt-1">
                Routed pipeline events
              </div>
            </button>

            {/* Agent Card 2: Doc Helper */}
            <button
              onClick={() => setActiveTab("docs")}
              className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                activeTab === "docs"
                  ? "bg-teal-500/5 border-teal-500 text-white"
                  : "bg-transparent border-slate-900 text-slate-400 hover:bg-slate-900/40"
              }`}
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-teal-500 rounded-l" />
              <div className="flex items-center gap-2 pl-1">
                <GitBranch className={`h-4.5 w-4.5 ${activeTab === "docs" ? "text-teal-400" : "text-slate-500"}`} />
                <span className="text-[14px] font-sans font-medium capitalize">doc helper</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] pl-1 text-slate-500 font-mono">
                <span>{docHelperStage}</span>
                <span>10 min ago</span>
              </div>
              <div className="mt-1.5 text-[12px] text-slate-500 font-mono truncate pl-1 border-t border-slate-900/30 pt-1">
                Updated Readme snapshot
              </div>
            </button>

            {/* Agent Card 3: Knowledge Base */}
            <button
              onClick={() => setActiveTab("kb")}
              className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                activeTab === "kb"
                  ? "bg-blue-500/5 border-blue-500 text-white"
                  : "bg-transparent border-slate-900 text-slate-400 hover:bg-slate-900/40"
              }`}
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500 rounded-l" />
              <div className="flex items-center gap-2 pl-1">
                <Search className={`h-4.5 w-4.5 ${activeTab === "kb" ? "text-blue-400" : "text-slate-500"}`} />
                <span className="text-[14px] font-sans font-medium capitalize">knowledge base</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] pl-1 text-slate-500 font-mono">
                <span>{chatLoading ? "querying" : "idle"}</span>
                <span>Just now</span>
              </div>
              <div className="mt-1.5 text-[12px] text-slate-500 font-mono truncate pl-1 border-t border-slate-900/30 pt-1">
                RAG vectors mapped
              </div>
            </button>

            {/* Agent Card 4: Cleaner */}
            <button
              onClick={() => setActiveTab("cleaner")}
              className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                activeTab === "cleaner"
                  ? "bg-amber-500/5 border-amber-500 text-white"
                  : "bg-transparent border-slate-900 text-slate-400 hover:bg-slate-900/40"
              }`}
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 rounded-l" />
              <div className="flex items-center gap-2 pl-1">
                <CodeXml className={`h-4.5 w-4.5 ${activeTab === "cleaner" ? "text-amber-400" : "text-slate-500"}`} />
                <span className="text-[14px] font-sans font-medium capitalize">cleaner agent</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[12px] pl-1 text-slate-500 font-mono">
                <span>{cleanerLoading ? "scanning" : "idle"}</span>
                <span>1 hour ago</span>
              </div>
              <div className="mt-1.5 text-[12px] text-slate-500 font-mono truncate pl-1 border-t border-slate-900/30 pt-1">
                Suggested unreferenced imports
              </div>
            </button>

          </div>

          {/* Idle visual reminder state */}
          {orchResult === null && docHelperStage === "idle" && !chatLoading && !cleanerLoading && (
            <div className="text-[12px] font-sans font-normal text-slate-500 bg-slate-950/20 border border-slate-900/60 p-3 rounded-lg text-center mt-3 border-dashed">
              Push to your repo to wake CodeLore.
            </div>
          )}
        </aside>

        {/* --- CENTER PANEL: Main Workspace (flex-grow) --- */}
        <main className="flex-1 min-w-0 bg-slate-950/20 border border-slate-850 rounded-2xl p-4 md:p-6 overflow-y-auto">
          
          <AnimatePresence mode="wait">
            {activeTab === "orchestrator" && (
              <motion.div
                key="ov-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <OrchestratorView
                  orchPayload={orchPayload}
                  setOrchPayload={setOrchPayload}
                  orchEventType={orchEventType}
                  setOrchEventType={setOrchEventType}
                  dispatchOrchEvent={dispatchOrchEvent}
                  orchResult={orchResult}
                  routingEvents={routingEvents}
                />
              </motion.div>
            )}

            {activeTab === "docs" && (
              <motion.div
                key="docs-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <DocHelperView
                  commitAuthor={commitAuthor}
                  setCommitAuthor={setCommitAuthor}
                  repoName={repoName}
                  setRepoName={setRepoName}
                  commitMessage={commitMessage}
                  setCommitMessage={setCommitMessage}
                  testDiff={testDiff}
                  setTestDiff={setTestDiff}
                  triggerPushWebhook={triggerPushWebhook}
                  isPushing={isPushing}
                  pendingWebhook={pendingWebhook}
                  customDraftContent={customDraftContent}
                  setCustomDraftContent={setCustomDraftContent}
                  approveReadmeRevision={approveReadmeRevision}
                  streamedText={streamedText}
                  docHelperStage={docHelperStage}
                  setPendingWebhook={setPendingWebhook}
                />
              </motion.div>
            )}

            {activeTab === "kb" && (
              <motion.div
                key="kb-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <KnowledgeBaseView
                  userQuery={userQuery}
                  setUserQuery={setUserQuery}
                  chatLog={chatLog}
                  chatLoading={chatLoading}
                  queryKnowledgeBase={queryKnowledgeBase}
                  newChunkFile={newChunkFile}
                  setNewChunkFile={setNewChunkFile}
                  newChunkSection={newChunkSection}
                  setNewChunkSection={setNewChunkSection}
                  newChunkContent={newChunkContent}
                  setNewChunkContent={setNewChunkContent}
                  addNewKnowledgeChunk={addNewKnowledgeChunk}
                  chunkAddSuccess={chunkAddSuccess}
                  activeCitationText={activeCitationText}
                  setActiveCitationText={setActiveCitationText}
                />
              </motion.div>
            )}

            {activeTab === "cleaner" && (
              <motion.div
                key="cleaner-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <CleanerAgentView
                  cleanerCode={cleanerCode}
                  setCleanerCode={setCleanerCode}
                  scanWholeWorkspace={scanWholeWorkspace}
                  setScanWholeWorkspace={setScanWholeWorkspace}
                  autoApplyPatch={autoApplyPatch}
                  setAutoApplyPatch={setAutoApplyPatch}
                  triggerCleanerScan={triggerCleanerScan}
                  cleanerLoading={cleanerLoading}
                  scannedIssues={scannedIssues}
                  scannedPatchId={scannedPatchId}
                  scannedPatchText={scannedPatchText}
                  applyCleanerPatch={applyCleanerPatch}
                  isPatchApplied={isPatchApplied}
                  renderedIssues={renderedIssues}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* --- RIGHT PANEL: CodeLore Vault (260px) --- */}
        <aside className="lg:w-[260px] shrink-0 bg-slate-950/20 border border-slate-850 rounded-2xl p-4 overflow-y-auto hidden lg:block">
          <VaultPanel
            sysInfo={sysInfo}
            parcleData={parcleData}
            setHistoricDiffOverlay={setHistoricDiffOverlay}
            setActiveTab={setActiveTab}
            theme={theme}
            vaultOpenOnMobile={vaultOpenOnMobile}
            setVaultOpenOnMobile={setVaultOpenOnMobile}
          />
        </aside>

      </div>

      {/* Mobile Vault drawer handle collapses */}
      <div className="lg:hidden shrink-0 border-t border-slate-900 bg-slate-950 select-none">
        <button
          onClick={() => setVaultOpenOnMobile(!vaultOpenOnMobile)}
          className="w-full text-center py-3 text-[12px] font-sans font-medium text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 cursor-pointer"
        >
          <Database className="h-3.5 w-3.5" />
          <span>{vaultOpenOnMobile ? "Collapse CodeLore Vault" : "Expand CodeLore Vault drawer"}</span>
        </button>

        {vaultOpenOnMobile && (
          <div className="p-4 bg-slate-950 max-h-[350px] overflow-y-auto border-t border-slate-900">
            <VaultPanel
              sysInfo={sysInfo}
              parcleData={parcleData}
              setHistoricDiffOverlay={setHistoricDiffOverlay}
              setActiveTab={setActiveTab}
              theme={theme}
              vaultOpenOnMobile={vaultOpenOnMobile}
              setVaultOpenOnMobile={setVaultOpenOnMobile}
            />
          </div>
        )}
      </div>

      {/* ----------------- CORE INTERACTIVE HISTORICAL COMPARE OVERLAY ----------------- */}
      <AnimatePresence>
        {historicDiffOverlay && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl text-slate-100"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-[14px] font-sans font-medium text-white">Compare README snapshots</h4>
                  <p className="text-[12px] text-slate-400 mt-0.5">SHA version code reference: {historicDiffOverlay.sha}</p>
                </div>
                <button
                  onClick={() => setHistoricDiffOverlay(null)}
                  className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto bg-slate-950 font-mono text-[11px]">
                <div>
                  <div className="text-[12px] font-sans font-normal text-rose-450 border-b border-slate-900 pb-1.5 mb-2">
                    Original template baseline
                  </div>
                  <pre className="bg-slate-900/40 border border-slate-900 p-2 text-slate-450 whitespace-pre-wrap rounded">
                    {historicDiffOverlay.oldContent}
                  </pre>
                </div>

                <div>
                  <div className="text-[12px] font-sans font-normal text-emerald-450 border-b border-slate-900 pb-1.5 mb-2">
                    Indexed snapshot backup content
                  </div>
                  <pre className="bg-slate-900 border border-slate-800 p-3 text-slate-300 whitespace-pre-wrap rounded">
                    {historicDiffOverlay.newContent}
                  </pre>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800/80 flex justify-end bg-slate-900/50">
                <button
                  onClick={() => setHistoricDiffOverlay(null)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[12px] font-sans font-normal px-4 py-1.5 rounded"
                >
                  Close diff reader
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Explicitly Humble */}
      <footer className="shrink-0 border-t border-slate-900 bg-slate-950/60 p-3.5 text-center text-[12px] text-slate-650 font-mono tracking-tight select-none">
        CodeLore Docs Assistant Online | Port: 3000 | Persistent layer active.
      </footer>

    </div>
  );
}
