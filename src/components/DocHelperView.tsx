import React from "react";
import { GitBranch, GitPullRequest, ChevronRight, Sparkles, Check, CheckCircle, RefreshCw } from "lucide-react";
import { WebhookResult } from "../types";

interface DocHelperViewProps {
  commitAuthor: string;
  setCommitAuthor: (val: string) => void;
  repoName: string;
  setRepoName: (val: string) => void;
  commitMessage: string;
  setCommitMessage: (val: string) => void;
  testDiff: string;
  setTestDiff: (val: string) => void;
  triggerPushWebhook: () => void;
  isPushing: boolean;
  pendingWebhook: WebhookResult | null;
  customDraftContent: string;
  setCustomDraftContent: (val: string) => void;
  approveReadmeRevision: () => void;
  streamedText: string;
  docHelperStage: "idle" | "writing" | "opening_pr" | "pr_opened";
  setPendingWebhook: (val: WebhookResult | null) => void;
}

export default function DocHelperView({
  commitAuthor,
  setCommitAuthor,
  repoName,
  setRepoName,
  commitMessage,
  setCommitMessage,
  testDiff,
  setTestDiff,
  triggerPushWebhook,
  isPushing,
  pendingWebhook,
  customDraftContent,
  setCustomDraftContent,
  approveReadmeRevision,
  streamedText,
  docHelperStage,
  setPendingWebhook
}: DocHelperViewProps) {

  // Parse lines for patterned syntax highlighting in git diff
  const renderGithubDiffLines = (diffText: string) => {
    return diffText.split("\n").map((line, idx) => {
      let lineStyle = "text-slate-400";
      let prefix = "";
      if (line.startsWith("+") && !line.startsWith("+++")) {
        lineStyle = "bg-teal-500/10 text-teal-300 font-mono py-0.5 border-l-2 border-teal-500 pl-1";
        prefix = "+ ";
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        lineStyle = "bg-rose-500/10 text-rose-300 font-mono py-0.5 border-l-2 border-rose-500 pl-1";
        prefix = "- ";
      } else if (line.startsWith("@@")) {
        lineStyle = "text-indigo-400/80 font-mono text-[11px] bg-indigo-500/5 py-0.5";
      } else if (line.startsWith("diff") || line.startsWith("index") || line.startsWith("---") || line.startsWith("+++")) {
        lineStyle = "text-slate-500 font-mono font-medium";
      }

      return (
        <div key={idx} className={`whitespace-pre-wrap select-text text-[11px] ${lineStyle}`}>
          {line}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb row */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-slate-400">documentation helper</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-teal-400">rewriteIndex</span>
      </div>

      {/* Title block */}
      <div>
        <h3 className="text-[16px] font-sans font-medium text-white flex items-center gap-2">
          <GitBranch className="h-4.5 w-4.5 text-teal-400" />
          <span>Documentation helper webhook</span>
        </h3>
        <p className="text-[12px] text-slate-400 mt-1">
          Automatically intercept repository pushes, analyze complete commit logs, rewrite relevant sections of structural Readme documentation, and open localized commits.
        </p>
      </div>

      {/* Simulator parameters input card */}
      <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 md:p-5 flex flex-col gap-4">
        <h4 className="text-[14px] font-sans font-medium text-slate-300">
          Simulate GitHub push event
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-sans font-normal text-slate-400">Author identity</label>
              <input
                type="text"
                value={commitAuthor}
                onChange={(e) => setCommitAuthor(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg text-[12px] font-sans p-2 text-slate-200 outline-none focus:border-teal-500 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-sans font-normal text-slate-400">Repository node</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg text-[12px] font-sans p-2 text-slate-200 outline-none focus:border-teal-500 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-sans font-normal text-slate-400">Commit status message</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg text-[12px] font-sans p-2 text-slate-200 outline-none focus:border-teal-500 transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-sans font-normal text-slate-400">Simulate code modification diff</label>
            <textarea
              value={testDiff}
              onChange={(e) => setTestDiff(e.target.value)}
              rows={6}
              className="bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] p-2 text-slate-200 outline-none focus:border-teal-500 transition resize-none h-full min-h-[140px]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={triggerPushWebhook}
            disabled={isPushing}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-sans font-medium text-[12px] py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition"
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>{isPushing ? "Analyzing diff..." : "Trigger git push webhook"}</span>
          </button>
        </div>
      </div>

      {/* Side by side split view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Git Diff Monospace Highlights */}
        <div className="flex flex-col gap-2 border border-slate-850 rounded-xl p-4 bg-slate-900/20">
          <h4 className="text-[13px] font-sans font-medium text-slate-400 border-b border-slate-900 pb-2">
            Incoming change diff block
          </h4>
          <div className="font-mono bg-slate-950 p-3 rounded-lg overflow-auto max-h-[300px] h-full min-h-[200px] leading-relaxed text-slate-350 select-text select-all">
            {renderGithubDiffLines(testDiff)}
          </div>
        </div>

        {/* Right Side: Readme preview (Character streaming representation) */}
        <div className="flex flex-col gap-2 border border-slate-850 rounded-xl p-4 bg-slate-900/20">
          <h4 className="text-[13px] font-sans font-medium text-slate-400 border-b border-slate-900 pb-2 flex items-center justify-between">
            <span>Readme.md preview</span>
            {docHelperStage === "writing" && (
              <span className="flex items-center gap-1.5 text-[10px] text-teal-400 font-mono selection:bg-transparent">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                <span>streaming draft...</span>
              </span>
            )}
          </h4>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-900 overflow-y-auto max-h-[300px] h-full min-h-[200px] prose prose-invert select-text leading-relaxed">
            {docHelperStage === "idle" && streamedText.length === 0 ? (
              <div className="text-[12px] font-sans font-normal text-slate-500 text-center py-10">
                Waiting for a GitHub push. README will auto-update on next commit.
              </div>
            ) : (
              <div className="text-[12px] font-sans font-normal text-slate-300">
                <span className="font-mono text-slate-400 block pb-2 mb-2 border-b border-slate-900/80 text-[11px]">
                  # Codebase snapshot output markup
                </span>
                <span className="whitespace-pre-wrap">{streamedText || customDraftContent || "Synthesized draft content loading..."}</span>
                <span className="inline-block w-1.5 h-3.5 bg-teal-400 ml-0.5 animate-pulse"></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Status Bar at Bottom */}
      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <span className="text-[11px] font-mono text-slate-500 tracking-wider">PIPELINE MONITOR</span>
        
        <div className="flex flex-wrap items-center gap-4 text-[12px] font-mono select-none">
          {/* Step 1: Diff received */}
          <div className={`flex items-center gap-1.5 ${streamedText.length > 0 || docHelperStage !== "idle" ? "text-teal-400" : "text-slate-600"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>diff processed</span>
          </div>

          <ChevronRight className="h-3.5 w-3.5 text-slate-700 hidden sm:block" />

          {/* Step 2: Writing */}
          <div className={`flex items-center gap-1.5 ${docHelperStage === "writing" ? "text-teal-400 animate-pulse" : streamedText.length > 0 ? "text-teal-400" : "text-slate-600"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>LLM rewriting</span>
          </div>

          <ChevronRight className="h-3.5 w-3.5 text-slate-700 hidden sm:block" />

          {/* Step 3: Approved / PR ready */}
          <div className={`flex items-center gap-1.5 ${(docHelperStage as string) === "opening_pr" ? "text-amber-400" : (docHelperStage as string) === "pr_opened" || (pendingWebhook && (docHelperStage as string) === "opening_pr") ? "text-teal-400" : "text-slate-600"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>PR candidate ready</span>
          </div>

          <ChevronRight className="h-3.5 w-3.5 text-slate-700 hidden sm:block" />

          {/* Step 4: Parcle synchronized */}
          <div className={`flex items-center gap-1.5 ${docHelperStage === "pr_opened" ? "text-emerald-400" : "text-slate-600"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current bg-emerald-500"></span>
            <span>Parcle saved</span>
          </div>
        </div>

        {/* PR Status transition pill: writing -> opening PR -> PR #42 opened */}
        <div className="ml-auto font-mono text-[11px]">
          {docHelperStage === "writing" && (
            <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-1 rounded">
              writing
            </span>
          )}
          {docHelperStage === "opening_pr" && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded">
              opening PR
            </span>
          )}
          {docHelperStage === "pr_opened" && (
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-medium">
              PR #42 opened
            </span>
          )}
          {docHelperStage === "idle" && (
            <span className="text-slate-500 font-mono">[ pipeline standby ]</span>
          )}
        </div>
      </div>

      {/* Inline Accept & Update representation */}
      {pendingWebhook && docHelperStage === "opening_pr" && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-sans font-medium text-white leading-none">Accept proposal draft</p>
              <p className="text-[11px] text-slate-400 mt-1">Accept the generated README.md changes to dynamically build the PR and sync Parcle databases.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPendingWebhook(null)}
              className="text-[11px] font-mono text-slate-400 hover:text-white px-3 py-1 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 cursor-pointer"
            >
              Reject
            </button>
            <button
              onClick={approveReadmeRevision}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-medium text-[11px] px-3.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Accept & update codebase docs</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
