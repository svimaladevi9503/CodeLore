import React from "react";
import { CleanerAgentViewProps } from "./cleaner/types";
import { useCleanerState } from "./cleaner/useCleanerState";
import { CleanerHeader } from "./cleaner/CleanerHeader";
import { ScanProgress } from "./cleaner/ScanProgress";
import { ProjectTreePanel } from "./cleaner/ProjectTreePanel";
import { IssueListPanel } from "./cleaner/IssueListPanel";
import { CodeViewerPanel } from "./cleaner/CodeViewerPanel";
import { FixPreviewModal } from "./cleaner/FixPreviewModal";

export default function CleanerAgentView({ theme, repoName, owner }: CleanerAgentViewProps) {
  const isDark = theme === "dark";

  const {
    treeData, treeLoading, totalCount, ignoredCount, projectDir, expandedDirs, selectedFile,
    fileContent, fileLoading, issues, filterSeverity, sortBy, scanProgress, scanning,
    scanError, setScanError, fixError, setFixError,
    showCodeViewer, highlightLines, fixPreview, applyingFix,
    nestedTree, filteredIssues, errorCount, warningCount, suggestionCount, resolvedCount, codeLines,
    setFilterSeverity, setSortBy, setShowCodeViewer, setHighlightLines, setFixPreview,
    fetchTree, toggleDir, loadFile, viewIssue, showFixPreview, applyFix, runScan
  } = useCleanerState(repoName);

  return (
    <div className="flex flex-col gap-4 relative h-full">
      <CleanerHeader
        isDark={isDark}
        scanning={scanning}
        treeLoading={treeLoading}
        issuesLength={issues.length}
        errorCount={errorCount}
        warningCount={warningCount}
        suggestionCount={suggestionCount}
        resolvedCount={resolvedCount}
        scanError={scanError}
        fixError={fixError}
        setScanError={setScanError}
        setFixError={setFixError}
        runScan={runScan}
      />

      {scanProgress && (
        <ScanProgress isDark={isDark} scanProgress={scanProgress} />
      )}

      {/* ─── MAIN LAYOUT: TREE + CENTER ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1 min-h-0">
        {/* ─── LEFT: PROJECT TREE ──────────────────────────────────── */}
        <ProjectTreePanel
          isDark={isDark}
          theme={theme}
          totalCount={totalCount}
          ignoredCount={ignoredCount}
          projectDir={projectDir}
          treeLoading={treeLoading}
          nestedTree={nestedTree}
          treeDataLength={treeData.length}
          expandedDirs={expandedDirs}
          selectedFile={selectedFile}
          fetchTree={fetchTree}
          toggleDir={toggleDir}
          loadFile={loadFile}
        />

        {/* ─── CENTER: TODO LIST / CODE VIEWER ─────────────────────── */}
        <div className={`rounded-xl border flex flex-col md:col-span-3 overflow-hidden min-h-[300px] ${
          isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
        }`}>
          {showCodeViewer && selectedFile ? (
            <CodeViewerPanel
              isDark={isDark}
              selectedFile={selectedFile}
              fileLoading={fileLoading}
              codeLines={codeLines}
              setShowCodeViewer={setShowCodeViewer}
              setHighlightLines={setHighlightLines}
            />
          ) : (
            <IssueListPanel
              isDark={isDark}
              theme={theme}
              repoName={repoName}
              issues={issues}
              filteredIssues={filteredIssues}
              filterSeverity={filterSeverity}
              sortBy={sortBy}
              scanning={scanning}
              setFilterSeverity={setFilterSeverity}
              setSortBy={setSortBy}
              viewIssue={viewIssue}
              showFixPreview={showFixPreview}
              runScan={runScan}
            />
          )}
        </div>
      </div>

      {fixPreview && (
        <FixPreviewModal
          isDark={isDark}
          fixPreview={fixPreview}
          applyingFix={applyingFix}
          setFixPreview={setFixPreview}
          applyFix={applyFix}
        />
      )}
    </div>
  );
}
