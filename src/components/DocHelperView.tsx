import React, { useState, useEffect } from "react";
import { GitHubUser, GitHubRepo } from "./orchestrator/useGitHub";

// Import broken-down sub-components
import ToastNotification from "./doc-helper/ToastNotification";
import DeleteConfirmationModal from "./doc-helper/DeleteConfirmationModal";
import DocHelperHeader from "./doc-helper/DocHelperHeader";
import EmptyStateWarning from "./doc-helper/EmptyStateWarning";
import ReadmeStatusPanel from "./doc-helper/ReadmeStatusPanel";
import ReadmeAiSettings from "./doc-helper/ReadmeAiSettings";
import ReadmeDraftPreview from "./doc-helper/ReadmeDraftPreview";
import GeminiRefinerChat from "./doc-helper/GeminiRefinerChat";
import CommitPushController from "./doc-helper/CommitPushController";

interface DocHelperViewProps {
  theme: "light" | "dark";
  repoName: string;
  setRepoName: (val: string) => void;
  fetchDiagnostics?: () => void;
  token: string;
  ghUser: GitHubUser | null;
  ghRepos: GitHubRepo[];
}

import { useDocHelperLogic } from "./doc-helper/useDocHelperLogic";

export default function DocHelperView(props: DocHelperViewProps) {
  const { theme, token, repoName } = props;
  const { state, actions } = useDocHelperLogic(props);

  return (
    <div className="flex flex-col gap-6">
      {state.toast && (
        <ToastNotification toast={state.toast} onClose={() => actions.setToast(null)} />
      )}

      {state.confirmDeleteOpen && (
        <DeleteConfirmationModal 
          theme={theme} 
          onCancel={() => actions.setConfirmDeleteOpen(false)} 
          onConfirm={actions.confirmDelete} 
        />
      )}

      <DocHelperHeader theme={theme} />

      {!token || !repoName ? (
        <EmptyStateWarning theme={theme} hasToken={!!token} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Setup Configurations & Existing README checker */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            <ReadmeStatusPanel 
              theme={theme}
              loadingReadme={state.loadingReadme}
              readmeError={state.readmeError}
              readmeExists={state.readmeExists}
              showSettings={state.showSettings}
              onToggleSettings={() => actions.setShowSettings((prev: boolean) => !prev)}
              onDeleteClick={actions.handleDeleteReadme}
              deleting={state.deleting}
            />

            {state.showSettings && (
              <ReadmeAiSettings 
                theme={theme}
                headerStyle={state.headerStyle} setHeaderStyle={actions.setHeaderStyle}
                badgeStyle={state.badgeStyle} setBadgeStyle={actions.setBadgeStyle}
                emojis={state.emojis} setEmojis={actions.setEmojis}
                align={state.align} setAlign={actions.setAlign}
                navigationStyle={state.navigationStyle} setNavigationStyle={actions.setNavigationStyle}
                onGenerate={actions.handleGenerateReadme}
                generating={state.generating}
                readmeExists={state.readmeExists}
              />
            )}
          </div>

          {/* RIGHT COLUMN: Output Preview / Refinement Chat / Push Action */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            {state.draftContent ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Preview Column */}
                <div className="lg:col-span-7">
                  <ReadmeDraftPreview 
                    theme={theme}
                    draftContent={state.draftContent}
                    previewMode={state.previewMode}
                    setPreviewMode={actions.setPreviewMode}
                  />
                </div>

                {/* Chat Column */}
                <div className="lg:col-span-5">
                  <GeminiRefinerChat 
                    theme={theme}
                    chatLogs={state.chatLogs}
                    chatInput={state.chatInput}
                    setChatInput={actions.setChatInput}
                    onSendChat={actions.handleSendChat}
                    refining={state.refining}
                  />
                </div>

                {/* Commit & Push Controller */}
                <CommitPushController 
                  theme={theme}
                  commitMessage={state.commitMessage}
                  setCommitMessage={actions.setCommitMessage}
                  onPush={actions.handlePushReadme}
                  pushing={state.pushing}
                />

              </div>
            ) : (
              <div className={`border border-dashed rounded-lg p-16 text-center text-[12px] font-sans font-normal ${
                theme === "dark"
                  ? "border-slate-850 text-slate-500"
                  : "border-slate-200 text-slate-450 bg-slate-50/50"
              }`}>
                Customize settings and trigger README generation to review output preview.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
