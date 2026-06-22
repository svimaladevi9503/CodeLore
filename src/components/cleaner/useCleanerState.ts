/* eslint-disable react-doctor/no-derived-state */
import { useState, useEffect, useCallback, useMemo } from "react";
import { CleanerIssue, RepoTreeNode } from "../../types";
import { buildTree } from "./utils";

export function useCleanerState(repoName: string) {
  const [treeData, setTreeData] = useState<RepoTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [projectDir, setProjectDir] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);

  const [issues, setIssues] = useState<CleanerIssue[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning" | "suggestion">("all");
  const [sortBy, setSortBy] = useState<"file" | "severity" | "category">("severity");
  const [scanProgress, setScanProgress] = useState<{ current: string; done: number; total: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [highlightLines, setHighlightLines] = useState<{ start: number; end: number } | null>(null);

  const [fixPreview, setFixPreview] = useState<{
    issue: CleanerIssue; oldCode: string; newCode: string;
  } | null>(null);
  const [applyingFix, setApplyingFix] = useState(false);

  const [patchLog, setPatchLog] = useState<any[]>([]);

  // ─── FETCH TREE ─────────────────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await fetch(`/api/cleaner/tree?repo=${encodeURIComponent(repoName || "custom-docs")}`);
      const data = await res.json();
      if (data.status === "success") {
        setTreeData(data.tree || []);
        setTotalCount(data.total_count || 0);
        setIgnoredCount(data.ignored_count || 0);
        setProjectDir(data.project_dir || "");
        // Auto-expand top-level directories
        const topDirs = new Set<string>();
        for (const node of (data.tree || [])) {
          if (node.type === "tree") {
            const depth = node.path.split("/").length;
            if (depth === 1) topDirs.add(node.path);
          }
        }
        setExpandedDirs(topDirs);
      }
    } catch (err) {
      console.error("Failed to fetch tree:", err);
    } finally {
      setTreeLoading(false);
    }
  }, [repoName]);

  // ─── RESET ON REPO CHANGE ───────────────────────────────────────────────
  const [prevRepoName, setPrevRepoName] = useState(repoName);
  if (repoName !== prevRepoName) {
    setPrevRepoName(repoName);
    setIssues([]);
    setPatchLog([]);
    setTreeData([]);
  }

  // ─── FETCH PATCH LOG ────────────────────────────────────────────────────
  const fetchPatchLog = useCallback(async () => {
    try {
      const res = await fetch(`/api/cleaner/patch-log?repo=${encodeURIComponent(repoName || "custom-docs")}`);
      const data = await res.json();
      if (data.status === "success") {
        setPatchLog(data.log || []);
      }
    } catch (err) {
      console.error("Failed to fetch patch log:", err);
    }
  }, [repoName]);

  useEffect(() => {
    fetchTree();
    fetchPatchLog();
  }, [fetchTree, fetchPatchLog]);

  // ─── BUILD NESTED TREE ──────────────────────────────────────────────────
  const nestedTree = useMemo(() => buildTree(treeData), [treeData]);

  // ─── TOGGLE DIRECTORY ───────────────────────────────────────────────────
  const toggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // ─── LOAD FILE CONTENT ─────────────────────────────────────────────────
  const loadFile = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setShowCodeViewer(true);
    setHighlightLines(null);
    setFileLoading(true);
    try {
      const res = await fetch(`/api/cleaner/file-content?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.status === "success") {
        setFileContent(data.content || "");
      }
    } catch (err) {
      console.error("Failed to load file:", err);
      setFileContent("// Failed to load file content");
    } finally {
      setFileLoading(false);
    }
  }, []);

  // ─── VIEW ISSUE ─────────────────────────────────────────────────────────
  const viewIssue = useCallback(async (issue: CleanerIssue) => {
    await loadFile(issue.file);
    setHighlightLines({ start: issue.line_start, end: issue.line_end });
    // Scroll to line after render
    setTimeout(() => {
      const el = document.getElementById(`cleaner-line-${issue.line_start}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [loadFile]);

  // ─── FIX PREVIEW ────────────────────────────────────────────────────────
  const showFixPreview = useCallback(async (issue: CleanerIssue) => {
    if (!issue.fix_snippet) return;
    try {
      const res = await fetch(`/api/cleaner/file-content?path=${encodeURIComponent(issue.file)}`);
      const data = await res.json();
      if (data.status === "success") {
        const lines = (data.content || "").split("\n");
        const oldLines = lines.slice((issue.line_start || 1) - 1, issue.line_end || issue.line_start);
        setFixPreview({
          issue,
          oldCode: oldLines.join("\n"),
          newCode: issue.fix_snippet,
        });
      }
    } catch (err) {
      console.error("Fix preview error:", err);
    }
  }, []);

  // ─── APPLY FIX ──────────────────────────────────────────────────────────
  const applyFix = useCallback(async () => {
    if (!fixPreview) return;
    setApplyingFix(true);
    try {
      const res = await fetch("/api/cleaner/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: fixPreview.issue.file,
          fix_snippet: fixPreview.issue.fix_snippet,
          line_start: fixPreview.issue.line_start,
          line_end: fixPreview.issue.line_end,
          category: fixPreview.issue.category,
          title: fixPreview.issue.title,
          repo: repoName,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        // Mark issue as resolved
        setIssues(prev =>
          prev.map(iss =>
            iss.file === fixPreview.issue.file &&
            iss.line_start === fixPreview.issue.line_start &&
            iss.title === fixPreview.issue.title
              ? { ...iss, resolved: true }
              : iss
          )
        );
        setFixPreview(null);
        fetchPatchLog();
      }
    } catch (err) {
      console.error("Apply fix error:", err);
      setFixError("Failed to apply fix patch. Please try again.");
    } finally {
      setApplyingFix(false);
    }
  }, [fixPreview, repoName, fetchPatchLog]);

  // ─── RUN SCAN ──────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    const sourceFiles = treeData.filter(n =>
      n.type === "blob" &&
      !n.ignored &&
      /\.(ts|tsx|js|jsx|py|css)$/.test(n.path)
    );

    if (sourceFiles.length === 0) return;

    setScanning(true);
    setScanError(null);
    setIssues([]);
    setShowCodeViewer(false);
    setScanProgress({ current: "Preparing...", done: 0, total: sourceFiles.length });

    // Fix #11: simulate progress so bar isn't frozen at 0 during the API wait
    let simDone = 0;
    const files = sourceFiles.map(f => ({ path: f.path, sha: f.sha }));
    const progressInterval = setInterval(() => {
      simDone = Math.min(simDone + 1, Math.floor(files.length * 0.9));
      setScanProgress({ current: `Analyzing ${files.length} files...`, done: simDone, total: files.length });
    }, 600);

    try {
      const res = await fetch("/api/cleaner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, repo: repoName }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setIssues(data.issues || []);
        setScanProgress({ current: "Complete!", done: files.length, total: files.length });
      }
    } catch (err) {
      console.error("Scan error:", err);
      setScanError("Scan failed. Check your connection and try again.");
    } finally {
      clearInterval(progressInterval);
      setScanning(false);
      setTimeout(() => setScanProgress(null), 2000);
    }
  }, [treeData, repoName]);

  // ─── FILTERED & SORTED ISSUES ──────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    let filtered = issues;
    if (filterSeverity !== "all") {
      filtered = filtered.filter(i => i.severity === filterSeverity);
    }
    const severityOrder = { error: 0, warning: 1, suggestion: 2 };
    return [...filtered].sort((a, b) => {
      if (sortBy === "severity") return (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
      if (sortBy === "file") return a.file.localeCompare(b.file);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return 0;
    });
  }, [issues, filterSeverity, sortBy]);

  // ─── STATS ──────────────────────────────────────────────────────────────
  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const suggestionCount = issues.filter(i => i.severity === "suggestion").length;
  const resolvedCount = issues.filter(i => i.resolved).length;

  // ─── CODE LINES WITH HIGHLIGHTING ──────────────────────────────────────
  const codeLines = useMemo(() => {
    return fileContent.split("\n").map((line, idx) => ({
      num: idx + 1,
      text: line,
      highlighted: highlightLines
        ? idx + 1 >= highlightLines.start && idx + 1 <= highlightLines.end
        : false,
    }));
  }, [fileContent, highlightLines]);

  return {
    treeData, treeLoading, totalCount, ignoredCount, projectDir, expandedDirs, selectedFile,
    fileContent, fileLoading, issues, filterSeverity, sortBy, scanProgress, scanning,
    scanError, setScanError, fixError, setFixError,
    showCodeViewer, highlightLines, fixPreview, applyingFix, patchLog,
    nestedTree, filteredIssues, errorCount, warningCount, suggestionCount, resolvedCount, codeLines,
    setFilterSeverity, setSortBy, setShowCodeViewer, setHighlightLines, setFixPreview,
    fetchTree, fetchPatchLog, toggleDir, loadFile, viewIssue, showFixPreview, applyFix, runScan
  };
}
