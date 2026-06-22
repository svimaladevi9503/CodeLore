import React, { useEffect, useRef, useReducer } from "react";
import { 
  Database, Cpu, Search, CodeXml, Sun, Moon, GitBranch, X
} from "lucide-react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";
import { SystemInfo, ParcleRecord, ScanIssue, WebhookResult } from "./types";

// Import modular subcomponents 3 panel workspace
import OrchestratorView from "./components/OrchestratorView";
import DocHelperView from "./components/DocHelperView";
import KnowledgeBaseView from "./components/KnowledgeBaseView";
import CleanerAgentView from "./components/CleanerAgentView";
import VaultPanel from "./components/VaultPanel";

// Render the agent states for top bar health metrics
const getAgentDotStyle = (active: boolean, err = false) => {
  if (err) return "bg-red-400";
  return active ? "bg-emerald-400 animate-pulse-dot" : "bg-slate-500";
};

// --- ORCHESTRATOR REDUCER ---
interface OrchState {
  payload: string;
  eventType: string;
  result: any;
}
type OrchAction =
  | { type: "SET_PAYLOAD"; value: string }
  | { type: "SET_EVENT_TYPE"; value: string }
  | { type: "SET_RESULT"; value: any };

const orchReducer = (state: OrchState, action: OrchAction): OrchState => {
  switch (action.type) {
    case "SET_PAYLOAD": return { ...state, payload: action.value };
    case "SET_EVENT_TYPE": return { ...state, eventType: action.value };
    case "SET_RESULT": return { ...state, result: action.value };
    default: return state;
  }
};

// --- DOC HELPER REDUCER ---
interface DocHelperState {
  commitAuthor: string;
  repoName: string;
  commitMessage: string;
  testDiff: string;
  isPushing: boolean;
  pendingWebhook: WebhookResult | null;
  customDraftContent: string;
  stage: "idle" | "writing" | "opening_pr" | "pr_opened";
  streamedText: string;
}
type DocHelperAction =
  | { type: "SET_AUTHOR"; value: string }
  | { type: "SET_REPO"; value: string }
  | { type: "SET_MESSAGE"; value: string }
  | { type: "SET_DIFF"; value: string }
  | { type: "SET_PUSHING"; value: boolean }
  | { type: "SET_PENDING"; value: WebhookResult | null }
  | { type: "SET_DRAFT"; value: string }
  | { type: "SET_STAGE"; value: DocHelperState["stage"] }
  | { type: "SET_STREAMED"; value: string };

const docHelperReducer = (state: DocHelperState, action: DocHelperAction): DocHelperState => {
  switch (action.type) {
    case "SET_AUTHOR": return { ...state, commitAuthor: action.value };
    case "SET_REPO": return { ...state, repoName: action.value };
    case "SET_MESSAGE": return { ...state, commitMessage: action.value };
    case "SET_DIFF": return { ...state, testDiff: action.value };
    case "SET_PUSHING": return { ...state, isPushing: action.value };
    case "SET_PENDING": return { ...state, pendingWebhook: action.value };
    case "SET_DRAFT": return { ...state, customDraftContent: action.value };
    case "SET_STAGE": return { ...state, stage: action.value };
    case "SET_STREAMED": return { ...state, streamedText: action.value };
    default: return state;
  }
};

// --- KNOWLEDGE BASE REDUCER ---
interface KbState {
  userQuery: string;
  chatLog: Array<{ sender: "user" | "agent"; text: string; sources?: any[]; timestamp: string }>;
  chatLoading: boolean;
  newChunkFile: string;
  newChunkSection: string;
  newChunkContent: string;
  chunkAddSuccess: boolean;
  activeCitationText: string | null;
  firstTokenReceived?: boolean;
  sessionId: string;
}
type KbAction =
  | { type: "SET_QUERY"; value: string }
  | { type: "SET_LOG"; value: KbState["chatLog"] | ((prev: KbState["chatLog"]) => KbState["chatLog"]) }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "SET_NEW_FILE"; value: string }
  | { type: "SET_NEW_SECTION"; value: string }
  | { type: "SET_NEW_CONTENT"; value: string }
  | { type: "SET_ADD_SUCCESS"; value: boolean }
  | { type: "SET_CITATION"; value: string | null }
  | { type: "ADD_OR_UPDATE_STREAMING_MSG"; value: any }
  | { type: "UPDATE_STREAMING_MSG"; id: string; value: any }
  | { type: "SET_FIRST_TOKEN_RECEIVED"; value: boolean }
  | { type: "SET_SESSION_ID"; value: string };

const kbReducer = (state: KbState, action: KbAction): KbState => {
  switch (action.type) {
    case "SET_QUERY": return { ...state, userQuery: action.value };
    case "SET_LOG": return { ...state, chatLog: typeof action.value === "function" ? action.value(state.chatLog) : action.value };
    case "SET_LOADING": return { ...state, chatLoading: action.value };
    case "SET_NEW_FILE": return { ...state, newChunkFile: action.value };
    case "SET_NEW_SECTION": return { ...state, newChunkSection: action.value };
    case "SET_NEW_CONTENT": return { ...state, newChunkContent: action.value };
    case "SET_ADD_SUCCESS": return { ...state, chunkAddSuccess: action.value };
    case "SET_CITATION": return { ...state, activeCitationText: action.value };
    case "SET_FIRST_TOKEN_RECEIVED": return { ...state, firstTokenReceived: action.value };
    case "SET_SESSION_ID": return { ...state, sessionId: action.value };
    case "ADD_OR_UPDATE_STREAMING_MSG": {
      const exists = state.chatLog.some(msg => (msg as any).id === action.value.id);
      if (exists) {
        return {
          ...state,
          chatLog: state.chatLog.map(msg => (msg as any).id === action.value.id ? { ...msg, ...action.value } : msg)
        };
      } else {
        return {
          ...state,
          chatLog: [...state.chatLog, action.value]
        };
      }
    }
    case "UPDATE_STREAMING_MSG": {
      return {
        ...state,
        chatLog: state.chatLog.map(msg => (msg as any).id === action.id ? { ...msg, ...action.value } : msg)
      };
    }
    default: return state;
  }
};

// --- CLEANER REDUCER ---
interface CleanerState {
  cleanerCode: string;
  scanWholeWorkspace: boolean;
  autoApplyPatch: boolean;
  scannedIssues: ScanIssue[];
  scannedPatchId: string;
  scannedPatchText: string;
  cleanerLoading: boolean;
  isPatchApplied: boolean;
  renderedIssues: ScanIssue[];
}
type CleanerAction =
  | { type: "SET_CODE"; value: string }
  | { type: "SET_SCAN_WHOLE"; value: boolean }
  | { type: "SET_AUTO_APPLY"; value: boolean }
  | { type: "SET_ISSUES"; value: ScanIssue[] }
  | { type: "SET_PATCH_ID"; value: string }
  | { type: "SET_PATCH_TEXT"; value: string }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "SET_PATCH_APPLIED"; value: boolean }
  | { type: "SET_RENDERED_ISSUES"; value: ScanIssue[] | ((prev: ScanIssue[]) => ScanIssue[]) };

const cleanerReducer = (state: CleanerState, action: CleanerAction): CleanerState => {
  switch (action.type) {
    case "SET_CODE": return { ...state, cleanerCode: action.value };
    case "SET_SCAN_WHOLE": return { ...state, scanWholeWorkspace: action.value };
    case "SET_AUTO_APPLY": return { ...state, autoApplyPatch: action.value };
    case "SET_ISSUES": return { ...state, scannedIssues: action.value };
    case "SET_PATCH_ID": return { ...state, scannedPatchId: action.value };
    case "SET_PATCH_TEXT": return { ...state, scannedPatchText: action.value };
    case "SET_LOADING": return { ...state, cleanerLoading: action.value };
    case "SET_PATCH_APPLIED": return { ...state, isPatchApplied: action.value };
    case "SET_RENDERED_ISSUES": return { ...state, renderedIssues: typeof action.value === "function" ? action.value(state.renderedIssues) : action.value };
    default: return state;
  }
};

// --- UI / GENERAL REDUCER ---
interface UiState {
  activeTab: "overview" | "orchestrator" | "docs" | "kb" | "cleaner" | "parcle";
  theme: "light" | "dark";
  sysInfo: SystemInfo | null;
  parcleData: ParcleRecord | null;
  historicDiffOverlay: {
    open: boolean;
    oldContent: string;
    newContent: string;
    sha: string;
  } | null;
  selectedEventId: string | null;
  vaultOpenOnMobile: boolean;
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
}

type UiAction =
  | { type: "SET_ACTIVE_TAB"; value: UiState["activeTab"] }
  | { type: "SET_THEME"; value: "light" | "dark" }
  | { type: "SET_SYS_INFO"; value: SystemInfo | null }
  | { type: "SET_PARCLE_DATA"; value: ParcleRecord | null }
  | { type: "SET_DIFF_OVERLAY"; value: UiState["historicDiffOverlay"] }
  | { type: "SET_SELECTED_EVENT_ID"; value: string | null }
  | { type: "SET_VAULT_MOBILE"; value: boolean }
  | { type: "SET_ROUTING_EVENTS"; value: UiState["routingEvents"] | ((prev: UiState["routingEvents"]) => UiState["routingEvents"]) };

const uiReducer = (state: UiState, action: UiAction): UiState => {
  switch (action.type) {
    case "SET_ACTIVE_TAB": return { ...state, activeTab: action.value };
    case "SET_THEME": return { ...state, theme: action.value };
    case "SET_SYS_INFO": return { ...state, sysInfo: action.value };
    case "SET_PARCLE_DATA": return { ...state, parcleData: action.value };
    case "SET_DIFF_OVERLAY": return { ...state, historicDiffOverlay: action.value };
    case "SET_SELECTED_EVENT_ID": return { ...state, selectedEventId: action.value };
    case "SET_VAULT_MOBILE": return { ...state, vaultOpenOnMobile: action.value };
    case "SET_ROUTING_EVENTS": return { ...state, routingEvents: typeof action.value === "function" ? action.value(state.routingEvents) : action.value };
    default: return state;
  }
};

// --- SUBCOMPONENTS TO REDUCE APP SIZE ---

interface HeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
  orchResult: any;
  docHelperStage: string;
  chatLoading: boolean;
  cleanerLoading: boolean;
}

function Header({
  theme,
  toggleTheme,
  orchResult,
  docHelperStage,
  chatLoading,
  cleanerLoading
}: HeaderProps) {
  return (
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
            <polygon 
              points="50,5 90,28 90,72 50,95 10,72 10,28" 
              stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
              strokeWidth="2.8" 
              strokeLinejoin="round"
              strokeOpacity="1.0"
            />
            <polygon 
              points="50,21 75,35 75,65 50,79 25,65 25,35" 
              stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
              strokeWidth="1.2" 
              strokeLinejoin="round"
              strokeOpacity="0.45"
            />
            <line x1="50" y1="5" x2="50" y2="21" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="90" y1="28" x2="75" y2="35" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="90" y1="72" x2="75" y2="65" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="50" y1="95" x2="50" y2="79" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="10" y1="72" x2="25" y2="65" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
            <line x1="10" y1="28" x2="25" y2="35" stroke={theme === "dark" ? "#f8fafc" : "#024D33"} strokeWidth="1.2" strokeOpacity="0.45" />
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
            <path 
              d="M 45,34 L 32,41 L 32,59 L 45,66" 
              stroke={theme === "dark" ? "#f8fafc" : "#024D33"} 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
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

      {/* 4 Agent Health Indicators in Center */}
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

      {/* Right tools */}
      <div className="flex items-center gap-4">
        <button
          type="button"
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
  );
}

interface AgentLensProps {
  activeTab: string;
  setActiveTab: (tab: "overview" | "orchestrator" | "docs" | "kb" | "cleaner" | "parcle") => void;
  orchResult: any;
  docHelperStage: string;
  chatLoading: boolean;
  cleanerLoading: boolean;
}

function AgentLens({
  activeTab,
  setActiveTab,
  orchResult,
  docHelperStage,
  chatLoading,
  cleanerLoading
}: AgentLensProps) {
  return (
    <aside className="lg:w-[200px] shrink-0 flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-1.5">
        <h3 className="text-[14px] font-sans font-medium text-slate-400">Agent Lens</h3>
        <span className="text-[12px] font-mono text-slate-500">4 stack</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
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

        <button
          type="button"
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

        <button
          type="button"
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

        <button
          type="button"
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

      {orchResult === null && docHelperStage === "idle" && !chatLoading && !cleanerLoading && (
        <div className="text-[12px] font-sans font-normal text-slate-500 bg-slate-950/20 border border-slate-900/60 p-3 rounded-lg text-center mt-3 border-dashed">
          Push to your repo to wake CodeLore.
        </div>
      )}
    </aside>
  );
}

interface CompareOverlayProps {
  overlay: {
    open: boolean;
    oldContent: string;
    newContent: string;
    sha: string;
  } | null;
  onClose: () => void;
}

function CompareOverlay({ overlay, onClose }: CompareOverlayProps) {
  if (!overlay) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl text-slate-100"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-[14px] font-sans font-medium text-white">Compare README snapshots</h4>
            <p className="text-[12px] text-slate-400 mt-0.5">SHA version code reference: {overlay.sha}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close diff overlay"
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
              {overlay.oldContent}
            </pre>
          </div>

          <div>
            <div className="text-[12px] font-sans font-normal text-emerald-450 border-b border-slate-900 pb-1.5 mb-2">
              Indexed snapshot backup content
            </div>
            <pre className="bg-slate-900 border border-slate-800 p-3 text-slate-300 whitespace-pre-wrap rounded">
              {overlay.newContent}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/80 flex justify-end bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[12px] font-sans font-normal px-4 py-1.5 rounded"
          >
            Close diff reader
          </button>
        </div>
      </m.div>
    </div>
  );
}

// Custom hook to extract all state logic and operations from the main App component
function useAppLogic() {
  const [orchState, dispatchOrch] = useReducer(orchReducer, {
    payload: "",
    eventType: "unknown",
    result: null
  });

  const [docHelperState, dispatchDocHelper] = useReducer(docHelperReducer, {
    commitAuthor: "github-expert",
    repoName: "",
    commitMessage: "fix: integrate standard real-time event pipeline for sensor feeds",
    testDiff: `diff --git a/src/pipeline.ts b/src/pipeline.ts
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
+}`,
    isPushing: false,
    pendingWebhook: null,
    customDraftContent: "",
    stage: "idle",
    streamedText: ""
  });

  const [kbState, dispatchKb] = useReducer(kbReducer, {
    userQuery: "",
    chatLog: [],
    chatLoading: false,
    newChunkFile: "api_endpoints.md",
    newChunkSection: "Authentication Headers",
    newChunkContent: "All requests to our microservice gate require signature matching inside headers.",
    chunkAddSuccess: false,
    activeCitationText: null,
    firstTokenReceived: false,
    sessionId: Math.random().toString(36).substring(2, 15)
  });

  const [cleanerState, dispatchCleaner] = useReducer(cleanerReducer, {
    cleanerCode: `import { useState, useEffect } from 'react';
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
}`,
    scanWholeWorkspace: false,
    autoApplyPatch: false,
    scannedIssues: [],
    scannedPatchId: "",
    scannedPatchText: "",
    cleanerLoading: false,
    isPatchApplied: false,
    renderedIssues: []
  });

  const [uiState, dispatchUi] = useReducer(uiReducer, {
    activeTab: "orchestrator",
    theme: typeof window !== "undefined" ? (localStorage.getItem("theme") as "light" | "dark") || "dark" : "dark",
    sysInfo: null,
    parcleData: null,
    historicDiffOverlay: null,
    selectedEventId: null,
    vaultOpenOnMobile: false,
    routingEvents: []
  });

  const loading = useRef<boolean>(true);
  
  // Pipeline Runs States
  const pipelineRunning = useRef<boolean>(false);
  const lastPipelineResult = useRef<any>(null);

  const toggleTheme = () => {
    dispatchUi({ type: "SET_THEME", value: uiState.theme === "dark" ? "light" : "dark" });
  };

  useEffect(() => {
    localStorage.setItem("theme", uiState.theme);
  }, [uiState.theme]);

  // Sync selected repo name to Orchestrator context API
  useEffect(() => {
    if (docHelperState.repoName) {
      fetch("/api/orchestrate/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_repo: docHelperState.repoName })
      }).catch((err) => console.error("Failed to sync active repo name:", err));
    }
  }, [docHelperState.repoName]);

  // Sync typewriter stream for Doc Helper
  useEffect(() => {
    if (docHelperState.pendingWebhook?.newReadme) {
      dispatchDocHelper({ type: "SET_STREAMED", value: "" });
      let idx = 0;
      const fullText = docHelperState.pendingWebhook.newReadme;
      const interval = setInterval(() => {
        if (idx < fullText.length) {
          dispatchDocHelper({ type: "SET_STREAMED", value: fullText.substring(0, idx + 8) });
          idx += 8;
        } else {
          clearInterval(interval);
        }
      }, 15);
      return () => clearInterval(interval);
    } else {
      dispatchDocHelper({ type: "SET_STREAMED", value: "" });
    }
  }, [docHelperState.pendingWebhook]);

  // Sync progressive issue highlighting
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (cleanerState.scannedIssues.length > 0) {
      dispatchCleaner({ type: "SET_RENDERED_ISSUES", value: [] });
      cleanerState.scannedIssues.forEach((issue, index) => {
        const timer = setTimeout(() => {
          dispatchCleaner({
            type: "SET_RENDERED_ISSUES",
            value: (prev) => [...prev, issue]
          });
        }, (index + 1) * 350);
        timers.push(timer);
      });
    } else {
      dispatchCleaner({ type: "SET_RENDERED_ISSUES", value: [] });
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [cleanerState.scannedIssues]);

  // Fetch metrics and records
  const fetchDiagnostics = async () => {
    try {
      const infoRes = await fetch("/api/sys-info");
      const infoData = await infoRes.json();
      dispatchUi({ type: "SET_SYS_INFO", value: infoData });

      const recRes = await fetch("/api/parcle/records");
      const recData = await recRes.json();
      dispatchUi({ type: "SET_PARCLE_DATA", value: recData.records });
      if (recData.records && Array.isArray(recData.records.routing_events)) {
        dispatchUi({ type: "SET_ROUTING_EVENTS", value: recData.records.routing_events });
      }
    } catch (err) {
      console.error("Diagnostic grab error:", err);
    } finally {
      loading.current = false;
    }
  };

  const [activeRepoName, setActiveRepoName] = React.useState<string>("");
  const [switchBanner, setSwitchBanner] = React.useState<{ show: boolean; repoName: string }>({ show: false, repoName: "" });

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  // Poll active repo context every 5s and handle repo switch
  useEffect(() => {
    const pollRepo = async () => {
      try {
        const res = await fetch("/api/orchestrate/context");
        const data = await res.json();
        if (data.status === "success" && data.context) {
          const newRepo = data.context.active_repo;
          if (activeRepoName && newRepo !== activeRepoName) {
            setActiveRepoName(newRepo);
            setSwitchBanner({ show: true, repoName: newRepo });

            // Reset session
            const newSessionId = Math.random().toString(36).substring(2, 15);
            dispatchKb({ type: "SET_SESSION_ID", value: newSessionId });

            // Clear chat log
            dispatchKb({ type: "SET_LOG", value: [] });

            // Re-fetch manifest/records
            await fetchDiagnostics();
          } else if (!activeRepoName) {
            setActiveRepoName(newRepo);
          }
        }
      } catch (err) {
        console.error("Failed to poll active repo context:", err);
      }
    };

    pollRepo();
    const interval = setInterval(pollRepo, 5000);
    return () => clearInterval(interval);
  }, [activeRepoName]);

  // Dynamic welcome message updates based on Parcle key kb:index:manifest
  useEffect(() => {
    if (uiState.parcleData) {
      const manifest = uiState.parcleData.metadata?.["kb:index:manifest"];
      let chunk_count = 0;
      let repo_name = activeRepoName || docHelperState.repoName || "custom-docs";
      let isEmpty = true;

      if (manifest) {
        if (Array.isArray(manifest)) {
          chunk_count = manifest.reduce((acc: number, curr: any) => acc + (curr.chunk_count || 0), 0);
          isEmpty = manifest.length === 0;
        } else if (typeof manifest === "object") {
          chunk_count = manifest.chunk_count || 0;
          repo_name = manifest.repo_name || repo_name;
          isEmpty = !manifest.files || manifest.files.length === 0;
        }
      }

      const activeRepo = uiState.parcleData.metadata?.["orchestrator:active_repo_context"]?.active_repo || repo_name;

      const welcomeText = isEmpty
        ? "Hey! No knowledge indexed yet. Add a file above to get started."
        : `Hey! I'm CodeLore's knowledge assistant. I'm loaded with ${chunk_count} memory chunks from ${activeRepo}. Ask me anything about the codebase.`;

      dispatchKb({
        type: "SET_LOG",
        value: (prev) => {
          const newMsg = {
            sender: "agent" as const,
            text: welcomeText,
            timestamp: prev[0]?.timestamp || new Date().toLocaleTimeString()
          };
          if (prev.length === 0) return [newMsg];
          if (prev[0].sender === "agent" && (prev[0].text.startsWith("Hey!") || prev[0].text.startsWith("Hello!"))) {
            return [newMsg, ...prev.slice(1)];
          }
          return prev;
        }
      });
    }
  }, [uiState.parcleData, activeRepoName, docHelperState.repoName]);

  // Run Orchestrator Sandbox Dispatcher
  const dispatchOrchEvent = async () => {
    if (!orchState.payload.trim()) return;
    try {
      dispatchOrch({ type: "SET_RESULT", value: null });
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: orchState.eventType, payload: orchState.payload })
      });
      const data = await res.json();
      dispatchOrch({ type: "SET_RESULT", value: data });

      // Automatically sync UI state & switch tabs based on targeted specialist route
      const targetAgent = data.agent || (data.classification && data.classification.route);
      
      if (targetAgent === "DOCUMENTATION HELPER" && data.status === "pending_approval" && data.result) {
        dispatchDocHelper({ type: "SET_PENDING", value: data.result });
        dispatchDocHelper({ type: "SET_DRAFT", value: data.result.newReadme });
        dispatchDocHelper({ type: "SET_STAGE", value: "opening_pr" });
        dispatchUi({ type: "SET_ACTIVE_TAB", value: "docs" });
      } else if (targetAgent === "CLEANER AGENT" && data.status === "success" && data.result) {
        dispatchCleaner({ type: "SET_SCANNED_ISSUES", value: data.result.issues });
        dispatchUi({ type: "SET_ACTIVE_TAB", value: "cleaner" });
      } else if (targetAgent === "KNOWLEDGE BASE AGENT" && data.status === "success" && data.result) {
        dispatchKb({
          type: "ADD_MESSAGE",
          value: {
            id: `msg_ans_${Date.now()}`,
            role: "assistant",
            content: data.result.answer,
            sources: data.result.sources
          }
        });
        dispatchUi({ type: "SET_ACTIVE_TAB", value: "kb" });
      }

      await fetchDiagnostics();
    } catch (err) {
      console.error("Orchestrator failure:", err);
    }
  };

  // Trigger push webhook (Documentation Helper)
  const triggerPushWebhook = async () => {
    dispatchDocHelper({ type: "SET_PUSHING", value: true });
    dispatchDocHelper({ type: "SET_STAGE", value: "writing" });
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitHistory: `Commit summary: ${docHelperState.commitMessage}\n\n${docHelperState.testDiff}`,
          repoName: docHelperState.repoName,
          author: docHelperState.commitAuthor
        })
      });
      const data = await res.json();
      if (data.status === "pending_approval") {
        dispatchDocHelper({ type: "SET_PENDING", value: data.result });
        dispatchDocHelper({ type: "SET_DRAFT", value: data.result.newReadme });
        dispatchDocHelper({ type: "SET_STAGE", value: "opening_pr" });
      }
    } catch (err) {
      console.error("Webhook push failed:", err);
      dispatchDocHelper({ type: "SET_STAGE", value: "idle" });
    } finally {
      dispatchDocHelper({ type: "SET_PUSHING", value: false });
    }
  };

  // Submit approved draft
  const approveReadmeRevision = async () => {
    if (!docHelperState.pendingWebhook) return;
    try {
      const res = await fetch("/api/approve-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sha: docHelperState.pendingWebhook.sha,
          content: docHelperState.customDraftContent,
          author: docHelperState.pendingWebhook.author,
          oldContent: docHelperState.pendingWebhook.oldReadme
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        dispatchDocHelper({ type: "SET_STAGE", value: "pr_opened" });
        setTimeout(() => {
          dispatchDocHelper({ type: "SET_PENDING", value: null });
          dispatchDocHelper({ type: "SET_STAGE", value: "idle" });
        }, 4000);
        fetchDiagnostics();
      }
    } catch (err) {
      console.error("Draft approval failed:", err);
    }
  };

  // Run KB Query (RAG) with SSE streaming
  const queryKnowledgeBase = async () => {
    if (!kbState.userQuery.trim()) return;
    
    const userMsg = { sender: "user" as const, text: kbState.userQuery, timestamp: new Date().toLocaleTimeString() };
    dispatchKb({ type: "SET_LOG", value: (prev) => [...prev, userMsg] });
    dispatchKb({ type: "SET_LOADING", value: true });
    dispatchKb({ type: "SET_FIRST_TOKEN_RECEIVED", value: false });
    const qTemp = kbState.userQuery;
    dispatchKb({ type: "SET_QUERY", value: "" });

    try {
      const res = await fetch("/api/kb/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: qTemp, session_id: kbState.sessionId })
      });

      if (!res.ok) {
        throw new Error("HTTP error " + res.status);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let done = false;
      let activeText = "";
      let sources: any[] = [];
      let firstTokenReceived = false;

      const agentMsgId = `agent-msg-${Date.now()}`;
      dispatchKb({
        type: "ADD_OR_UPDATE_STREAMING_MSG",
        value: {
          id: agentMsgId,
          sender: "agent",
          text: "",
          sources: [],
          timestamp: new Date().toLocaleTimeString()
        }
      });

      let buffer = "";
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error === "no_results") {
                  activeText = parsed.message;
                  dispatchKb({
                    type: "UPDATE_STREAMING_MSG",
                    id: agentMsgId,
                    value: { text: activeText, sources: [] }
                  });
                  break;
                }
                if (parsed.sources) {
                  sources = parsed.sources;
                  dispatchKb({
                    type: "UPDATE_STREAMING_MSG",
                    id: agentMsgId,
                    value: { sources }
                  });
                }
                if (parsed.token) {
                  if (!firstTokenReceived) {
                    firstTokenReceived = true;
                    dispatchKb({ type: "SET_FIRST_TOKEN_RECEIVED", value: true });
                  }
                  activeText += parsed.token;
                  dispatchKb({
                    type: "UPDATE_STREAMING_MSG",
                    id: agentMsgId,
                    value: { text: activeText }
                  });
                }
              } catch (e) {
                console.error("Error parsing stream line", e);
              }
            }
          }
        }
      }
      fetchDiagnostics();

    } catch (err) {
      console.error("KB query error:", err);
    } finally {
      dispatchKb({ type: "SET_LOADING", value: false });
      dispatchKb({ type: "SET_FIRST_TOKEN_RECEIVED", value: false });
    }
  };

  // Add custom layout chunk to Parcle
  const addNewKnowledgeChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbState.newChunkContent.trim() || !kbState.newChunkFile.trim()) return;
    try {
      const res = await fetch("/api/rag/add-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: kbState.newChunkFile,
          section: kbState.newChunkSection,
          content: kbState.newChunkContent
        })
      });
      if (res.ok) {
        dispatchKb({ type: "SET_NEW_CONTENT", value: "" });
        dispatchKb({ type: "SET_ADD_SUCCESS", value: true });
        setTimeout(() => dispatchKb({ type: "SET_ADD_SUCCESS", value: false }), 3000);
        fetchDiagnostics();
      }
    } catch (err) {
      console.error("Add chunk fail:", err);
    }
  };

  // Execute Code Cleaner Scan
  const triggerCleanerScan = async () => {
    dispatchCleaner({ type: "SET_LOADING", value: true });
    dispatchCleaner({ type: "SET_PATCH_APPLIED", value: false });
    try {
      const res = await fetch("/api/clean/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanerState.cleanerCode,
          scanWholeWorkspace: cleanerState.scanWholeWorkspace
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        dispatchCleaner({ type: "SET_ISSUES", value: data.result.issues });
        dispatchCleaner({ type: "SET_PATCH_ID", value: data.result.patch_id });
        dispatchCleaner({ type: "SET_PATCH_TEXT", value: data.result.patch });
        fetchDiagnostics();

        if (cleanerState.autoApplyPatch && data.result.patch_id) {
          await applyCleanerPatch(data.result.patch_id);
        }
      }
    } catch (err) {
      console.error("Cleaner execution error:", err);
    } finally {
      dispatchCleaner({ type: "SET_LOADING", value: false });
    }
  };

  // Apply Cleaner Patch
  const applyCleanerPatch = async (forcedPatchId?: string) => {
    const pId = typeof forcedPatchId === "string" ? forcedPatchId : cleanerState.scannedPatchId;
    if (!pId) return;
    try {
      const res = await fetch("/api/clean/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patchId: pId })
      });
      const data = await res.json();
      if (data.status === "success") {
        dispatchCleaner({ type: "SET_PATCH_APPLIED", value: true });
        dispatchCleaner({ type: "SET_ISSUES", value: [] });
        fetchDiagnostics();
      }
    } catch (err) {
      console.error("Apply patch fail:", err);
    }
  };

  // Trigger testing pipeline runs
  const runPipelineCheck = async () => {
    pipelineRunning.current = true;
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CI Pipeline standard verification" })
      });
      const data = await res.json();
      lastPipelineResult.current = data;
      fetchDiagnostics();
    } catch (err) {
      console.error("Pipeline query failed:", err);
    } finally {
      pipelineRunning.current = false;
    }
  };

  return {
    orchState,
    dispatchOrch,
    docHelperState,
    dispatchDocHelper,
    kbState,
    dispatchKb,
    cleanerState,
    dispatchCleaner,
    uiState,
    dispatchUi,
    toggleTheme,
    dispatchOrchEvent,
    triggerPushWebhook,
    approveReadmeRevision,
    queryKnowledgeBase,
    addNewKnowledgeChunk,
    triggerCleanerScan,
    applyCleanerPatch,
    runPipelineCheck,
    fetchDiagnostics,
    activeRepoName,
    switchBanner,
    setSwitchBanner
  };
}

export default function App() {
  const {
    orchState,
    dispatchOrch,
    docHelperState,
    dispatchDocHelper,
    kbState,
    dispatchKb,
    cleanerState,
    dispatchCleaner,
    uiState,
    dispatchUi,
    toggleTheme,
    dispatchOrchEvent,
    triggerPushWebhook,
    approveReadmeRevision,
    queryKnowledgeBase,
    addNewKnowledgeChunk,
    triggerCleanerScan,
    applyCleanerPatch,
    fetchDiagnostics,
    activeRepoName,
    switchBanner,
    setSwitchBanner
  } = useAppLogic();

  return (
    <LazyMotion features={domAnimation}>
      <div className={`min-h-screen font-sans flex flex-col antialiased transition-colors duration-250 ${
        uiState.theme === "dark" 
          ? "bg-[#070b13] text-slate-100" 
          : "light-mode bg-[#f8fafc] text-slate-800"
      }`}>
      
        {/* ----------------- TOP BAR ----------------- */}
        <Header
          theme={uiState.theme}
          toggleTheme={toggleTheme}
          orchResult={orchState.result}
          docHelperStage={docHelperState.stage}
          chatLoading={kbState.chatLoading}
          cleanerLoading={cleanerState.cleanerLoading}
        />

        {/* ----------------- LAYOUT 3 PANEL WORKSPACE ----------------- */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* --- LEFT PANEL: Agent Lens (200px) --- */}
          <AgentLens
            activeTab={uiState.activeTab}
            setActiveTab={(tab) => dispatchUi({ type: "SET_ACTIVE_TAB", value: tab })}
            orchResult={orchState.result}
            docHelperStage={docHelperState.stage}
            chatLoading={kbState.chatLoading}
            cleanerLoading={cleanerState.cleanerLoading}
          />

          {/* --- CENTER PANEL: Main Workspace (flex-grow) --- */}
          <main className="flex-1 min-w-0 bg-slate-950/20 border border-slate-850 rounded-2xl p-4 md:p-6 overflow-y-auto">
            
            <AnimatePresence mode="wait">
              {uiState.activeTab === "orchestrator" && (
                <m.div
                  key="ov-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <OrchestratorView
                    theme={uiState.theme}
                    orchPayload={orchState.payload}
                    setOrchPayload={(val) => dispatchOrch({ type: "SET_PAYLOAD", value: val })}
                    orchEventType={orchState.eventType}
                    setOrchEventType={(val) => dispatchOrch({ type: "SET_EVENT_TYPE", value: val })}
                    dispatchOrchEvent={dispatchOrchEvent}
                    orchResult={orchState.result}
                    routingEvents={uiState.routingEvents}
                    repoName={docHelperState.repoName}
                    setRepoName={(val) => dispatchDocHelper({ type: "SET_REPO", value: val })}
                  />
                </m.div>
              )}

              {uiState.activeTab === "docs" && (
                <m.div
                  key="docs-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <DocHelperView
                    theme={uiState.theme}
                    repoName={docHelperState.repoName}
                    setRepoName={(val) => dispatchDocHelper({ type: "SET_REPO", value: val })}
                    fetchDiagnostics={fetchDiagnostics}
                  />
                </m.div>
              )}

              {uiState.activeTab === "kb" && (
                <m.div
                  key="kb-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <KnowledgeBaseView
                    userQuery={kbState.userQuery}
                    setUserQuery={(val) => dispatchKb({ type: "SET_QUERY", value: val })}
                    chatLog={kbState.chatLog}
                    chatLoading={kbState.chatLoading}
                    firstTokenReceived={kbState.firstTokenReceived}
                    queryKnowledgeBase={queryKnowledgeBase}
                    activeCitationText={kbState.activeCitationText}
                    setActiveCitationText={(val) => dispatchKb({ type: "SET_CITATION", value: val })}
                    theme={uiState.theme}
                    parcleData={uiState.parcleData}
                    repoName={activeRepoName || "custom-docs"}
                    fetchDiagnostics={fetchDiagnostics}
                    switchBanner={switchBanner}
                    setSwitchBanner={setSwitchBanner}
                  />
                </m.div>
              )}

              {uiState.activeTab === "cleaner" && (
                <m.div
                  key="cleaner-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <CleanerAgentView
                    theme={uiState.theme}
                    repoName={activeRepoName || docHelperState.repoName || "custom-docs"}
                    owner=""
                  />
                </m.div>
              )}
            </AnimatePresence>

          </main>

          {/* --- RIGHT PANEL: CodeLore Vault (260px) --- */}
          <aside className="lg:w-[260px] shrink-0 bg-slate-950/20 border border-slate-850 rounded-2xl p-4 overflow-y-auto hidden lg:block">
            <VaultPanel
              sysInfo={uiState.sysInfo}
              parcleData={uiState.parcleData}
              setHistoricDiffOverlay={(val) => dispatchUi({ type: "SET_DIFF_OVERLAY", value: val })}
              setActiveTab={(tab) => dispatchUi({ type: "SET_ACTIVE_TAB", value: tab })}
              theme={uiState.theme}
              vaultOpenOnMobile={uiState.vaultOpenOnMobile}
              setVaultOpenOnMobile={(val) => dispatchUi({ type: "SET_VAULT_MOBILE", value: val })}
              activeTab={uiState.activeTab}
              repoName={activeRepoName || docHelperState.repoName || "custom-docs"}
            />
          </aside>

        </div>

        {/* Mobile Vault drawer handle collapses */}
        <div className="lg:hidden shrink-0 border-t border-slate-900 bg-slate-950 select-none">
          <button
            type="button"
            onClick={() => dispatchUi({ type: "SET_VAULT_MOBILE", value: !uiState.vaultOpenOnMobile })}
            className="w-full text-center py-3 text-[12px] font-sans font-medium text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{uiState.vaultOpenOnMobile ? "Collapse CodeLore Vault" : "Expand CodeLore Vault drawer"}</span>
          </button>

          {uiState.vaultOpenOnMobile && (
            <div className="p-4 bg-slate-950 max-h-[350px] overflow-y-auto border-t border-slate-900">
              <VaultPanel
                sysInfo={uiState.sysInfo}
                parcleData={uiState.parcleData}
                setHistoricDiffOverlay={(val) => dispatchUi({ type: "SET_DIFF_OVERLAY", value: val })}
                setActiveTab={(tab) => dispatchUi({ type: "SET_ACTIVE_TAB", value: tab })}
                theme={uiState.theme}
                vaultOpenOnMobile={uiState.vaultOpenOnMobile}
                setVaultOpenOnMobile={(val) => dispatchUi({ type: "SET_VAULT_MOBILE", value: val })}
                activeTab={uiState.activeTab}
                repoName={activeRepoName || docHelperState.repoName || "custom-docs"}
              />
            </div>
          )}
        </div>

        {/* ----------------- CORE INTERACTIVE HISTORICAL COMPARE OVERLAY ----------------- */}
        <AnimatePresence>
          <CompareOverlay
            overlay={uiState.historicDiffOverlay}
            onClose={() => dispatchUi({ type: "SET_DIFF_OVERLAY", value: null })}
          />
        </AnimatePresence>

        {/* Footer Explicitly Humble */}
        <footer className="shrink-0 border-t border-slate-900 bg-slate-950/60 p-3.5 text-center text-[12px] text-slate-650 font-mono tracking-tight select-none">
          CodeLore Docs Assistant Online | Port: 3000 | Persistent layer active.
        </footer>

      </div>
    </LazyMotion>
  );
}
