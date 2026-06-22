import { SystemInfo, ParcleRecord, ScanIssue, WebhookResult } from "./types";

// --- ORCHESTRATOR REDUCER ---
export interface OrchState {
  payload: string;
  eventType: string;
  result: any;
}
export type OrchAction =
  | { type: "SET_PAYLOAD"; value: string }
  | { type: "SET_EVENT_TYPE"; value: string }
  | { type: "SET_RESULT"; value: any };

export const orchReducer = (state: OrchState, action: OrchAction): OrchState => {
  switch (action.type) {
    case "SET_PAYLOAD": return { ...state, payload: action.value };
    case "SET_EVENT_TYPE": return { ...state, eventType: action.value };
    case "SET_RESULT": return { ...state, result: action.value };
    default: return state;
  }
};

// --- DOC HELPER REDUCER ---
export interface DocHelperState {
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
export type DocHelperAction =
  | { type: "SET_AUTHOR"; value: string }
  | { type: "SET_REPO"; value: string }
  | { type: "SET_MESSAGE"; value: string }
  | { type: "SET_DIFF"; value: string }
  | { type: "SET_PUSHING"; value: boolean }
  | { type: "SET_PENDING"; value: WebhookResult | null }
  | { type: "SET_DRAFT"; value: string }
  | { type: "SET_STAGE"; value: DocHelperState["stage"] }
  | { type: "SET_STREAMED"; value: string };

export const docHelperReducer = (state: DocHelperState, action: DocHelperAction): DocHelperState => {
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
export interface KbState {
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
export type KbAction =
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

export const kbReducer = (state: KbState, action: KbAction): KbState => {
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
export interface CleanerState {
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
export type CleanerAction =
  | { type: "SET_CODE"; value: string }
  | { type: "SET_SCAN_WHOLE"; value: boolean }
  | { type: "SET_AUTO_APPLY"; value: boolean }
  | { type: "SET_ISSUES"; value: ScanIssue[] }
  | { type: "SET_PATCH_ID"; value: string }
  | { type: "SET_PATCH_TEXT"; value: string }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "SET_PATCH_APPLIED"; value: boolean }
  | { type: "SET_RENDERED_ISSUES"; value: ScanIssue[] | ((prev: ScanIssue[]) => ScanIssue[]) };

export const cleanerReducer = (state: CleanerState, action: CleanerAction): CleanerState => {
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
export interface UiState {
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

export type UiAction =
  | { type: "SET_ACTIVE_TAB"; value: UiState["activeTab"] }
  | { type: "SET_THEME"; value: "light" | "dark" }
  | { type: "SET_SYS_INFO"; value: SystemInfo | null }
  | { type: "SET_PARCLE_DATA"; value: ParcleRecord | null }
  | { type: "SET_DIFF_OVERLAY"; value: UiState["historicDiffOverlay"] }
  | { type: "SET_SELECTED_EVENT_ID"; value: string | null }
  | { type: "SET_VAULT_MOBILE"; value: boolean }
  | { type: "SET_ROUTING_EVENTS"; value: UiState["routingEvents"] | ((prev: UiState["routingEvents"]) => UiState["routingEvents"]) };

export const uiReducer = (state: UiState, action: UiAction): UiState => {
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
