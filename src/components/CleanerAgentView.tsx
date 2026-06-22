import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronRight, ChevronDown, RefreshCw, Play, Eye, Check,
  X, FileCode, FolderOpen, Folder, AlertTriangle, Rocket,
  Shield, LayoutList, BookOpen, PackageX, Code2, Sparkles
} from "lucide-react";
import { CleanerIssue, RepoTreeNode } from "../types";

// ─── TYPES ────────────────────────────────────────────────────────────────
interface CleanerAgentViewProps {
  theme: "light" | "dark";
  repoName: string;
  owner: string;
}

interface TreeFolder {
  name: string;
  path: string;
  children: (TreeFolder | TreeFile)[];
  type: "tree";
}

interface TreeFile {
  name: string;
  path: string;
  size?: number;
  sha: string;
  ignored?: boolean;
  type: "blob";
}

type TreeNode = TreeFolder | TreeFile;

// ─── FILE ICON HELPER ─────────────────────────────────────────────────────
function FileIcon({ filename, className = "" }: { filename: string; className?: string }) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const base = `h-3.5 w-3.5 shrink-0 ${className}`;
  switch (ext) {
    case 'ts': case 'tsx':
      return <span className={`${base} text-blue-400`} title="TypeScript">TS</span>;
    case 'js': case 'jsx':
      return <span className={`${base} text-amber-400`} title="JavaScript">JS</span>;
    case 'py':
      return <span className={`${base} text-teal-400`} title="Python">PY</span>;
    case 'md':
      return <span className={`${base} text-slate-400`} title="Markdown">MD</span>;
    case 'json':
      return <span className={`${base} text-purple-400`} title="JSON">{'{}'}</span>;
    case 'css':
      return <span className={`${base} text-pink-400`} title="CSS">CS</span>;
    default:
      return <FileCode className={`${base} text-slate-500`} />;
  }
}

// ─── CATEGORY HELPERS ─────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  unused_import: <PackageX className="h-3.5 w-3.5" />,
  syntax_error: <AlertTriangle className="h-3.5 w-3.5" />,
  performance: <Rocket className="h-3.5 w-3.5" />,
  security: <Shield className="h-3.5 w-3.5" />,
  srp: <LayoutList className="h-3.5 w-3.5" />,
  readability: <BookOpen className="h-3.5 w-3.5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  unused_import: "text-orange-400",
  syntax_error: "text-red-400",
  performance: "text-sky-400",
  security: "text-rose-400",
  srp: "text-violet-400",
  readability: "text-emerald-400",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  error: { bg: "bg-[#E24B4A]", text: "text-white", label: "Error" },
  warning: { bg: "bg-[#EF9F27]", text: "text-slate-900", label: "Warning" },
  suggestion: { bg: "bg-[#1D9E75]", text: "text-white", label: "Suggestion" },
};

// ─── BUILD NESTED TREE ────────────────────────────────────────────────────
function buildTree(flatNodes: RepoTreeNode[]): TreeNode[] {
  const root: TreeFolder = { name: "", path: "", children: [], type: "tree" };
  const dirMap = new Map<string, TreeFolder>();
  dirMap.set("", root);

  // Ensure parent directories exist
  const ensureDir = (dirPath: string): TreeFolder => {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;
    const parts = dirPath.split("/");
    const parentPath = parts.slice(0, -1).join("/");
    const parent = ensureDir(parentPath);
    const folder: TreeFolder = { name: parts[parts.length - 1], path: dirPath, children: [], type: "tree" };
    dirMap.set(dirPath, folder);
    parent.children.push(folder);
    return folder;
  };

  for (const node of flatNodes) {
    const parts = node.path.split("/");
    if (node.type === "tree") {
      ensureDir(node.path);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = ensureDir(parentPath);
      parent.children.push({
        name: parts[parts.length - 1],
        path: node.path,
        size: node.size,
        sha: node.sha,
        ignored: node.ignored,
        type: "blob",
      });
    }
  }

  // Sort: folders first, then files alphabetically
  const sortChildren = (children: TreeNode[]): TreeNode[] => {
    return children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(child => {
      if (child.type === "tree") {
        (child as TreeFolder).children = sortChildren((child as TreeFolder).children);
      }
      return child;
    });
  };

  root.children = sortChildren(root.children);
  return root.children;
}

// ─── TREE ROW COMPONENT ──────────────────────────────────────────────────
interface TreeRowProps {
  key?: React.Key;
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  selectedFile: string | null;
  onFileClick: (path: string) => void;
  theme: string;
}

function TreeRow({
  node, depth, expandedDirs, toggleDir, selectedFile, onFileClick, theme
}: TreeRowProps) {
  if (node.type === "tree") {
    const folder = node as TreeFolder;
    const isExpanded = expandedDirs.has(folder.path);
    return (
      <>
        <button
          type="button"
          onClick={() => toggleDir(folder.path)}
          className={`w-full flex items-center gap-1.5 py-1 px-1 rounded text-left font-mono text-[11px] transition-colors select-none cursor-pointer ${
            theme === "dark"
              ? "hover:bg-[#1a1f2e] text-slate-400"
              : "hover:bg-[#f8f8f8] text-slate-600"
          }`}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {isExpanded
            ? <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
            : <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
          }
          {isExpanded
            ? <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            : <Folder className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
          }
          <span className="truncate">{folder.name}</span>
        </button>
        {isExpanded && folder.children.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            selectedFile={selectedFile}
            onFileClick={onFileClick}
            theme={theme}
          />
        ))}
      </>
    );
  }

  const file = node as TreeFile;
  const isSelected = selectedFile === file.path;
  const sizeStr = file.size != null ? `${(file.size / 1024).toFixed(1)} KB` : "";

  return (
    <button
      type="button"
      onClick={() => !file.ignored && onFileClick(file.path)}
      disabled={file.ignored}
      className={`w-full flex items-center justify-between py-1 px-1 rounded text-left font-mono text-[11px] transition-all select-none ${
        file.ignored
          ? "opacity-40 cursor-default line-through"
          : isSelected
            ? theme === "dark"
              ? "bg-[#5DCAA5]/10 border-l-2 border-[#5DCAA5] text-white"
              : "bg-[#1D9E75]/10 border-l-2 border-[#1D9E75] text-slate-900"
            : theme === "dark"
              ? "hover:bg-[#1a1f2e] text-slate-400 cursor-pointer"
              : "hover:bg-[#f8f8f8] text-slate-600 cursor-pointer"
      }`}
      style={{ paddingLeft: `${depth * 16 + 4}px` }}
    >
      <div className="flex items-center gap-1.5 truncate min-w-0">
        <FileIcon filename={file.name} className="text-[9px] font-bold" />
        <span className="truncate">{file.name}</span>
        {file.ignored && (
          <span className={`text-[8px] px-1 rounded ${theme === "dark" ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-400"}`}>
            ignored
          </span>
        )}
      </div>
      {sizeStr && !file.ignored && (
        <span className={`text-[9px] shrink-0 ${theme === "dark" ? "text-slate-600" : "text-slate-400"}`}>
          {sizeStr}
        </span>
      )}
    </button>
  );
}

// ─── TO-DO CARD COMPONENT ─────────────────────────────────────────────────
interface TodoCardProps {
  key?: React.Key;
  issue: CleanerIssue;
  index: number;
  theme: string;
  onView: () => void;
  onFix: () => void;
}

function TodoCard({
  issue, index, theme, onView, onFix
}: TodoCardProps) {
  const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.suggestion;
  const catColor = CATEGORY_COLORS[issue.category] || "text-slate-400";
  const catIcon = CATEGORY_ICONS[issue.category] || <Code2 className="h-3.5 w-3.5" />;

  return (
    <div
      className={`cleaner-todo-card rounded-lg border p-3 transition-all ${
        issue.resolved
          ? theme === "dark"
            ? "border-emerald-500/20 bg-emerald-500/5 opacity-60"
            : "border-emerald-300 bg-emerald-50 opacity-60"
          : theme === "dark"
            ? "border-slate-800 bg-slate-900/40 hover:border-slate-700"
            : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {/* Row 1: severity badge + category icon + title */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`${sev.bg} ${sev.text} text-[9px] font-bold uppercase px-2 py-0.5 rounded-full leading-none tracking-wide`}>
          {sev.label}
        </span>
        <span className={catColor}>{catIcon}</span>
        <span className={`text-[12px] font-medium truncate ${
          issue.resolved ? "line-through" : theme === "dark" ? "text-slate-200" : "text-slate-800"
        }`}>
          {issue.title}
        </span>
      </div>

      {/* Row 2: file + lines + actions */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-mono truncate ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
          {issue.file} &nbsp;lines {issue.line_start}–{issue.line_end}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onView}
            className={`text-[10px] font-medium px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
              theme === "dark"
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>View</span>
          </button>
          {issue.fix_snippet && !issue.resolved && (
            <button
              type="button"
              onClick={onFix}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition cursor-pointer flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              <span>Fix</span>
            </button>
          )}
          {issue.resolved && (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
              <Check className="h-3 w-3" /> Resolved
            </span>
          )}
        </div>
      </div>

      {/* Row 3: description */}
      <p className={`text-[11px] mt-1.5 leading-snug ${
        theme === "dark" ? "text-slate-500" : "text-slate-400"
      }`}>
        {issue.description}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function CleanerAgentView({ theme, repoName, owner }: CleanerAgentViewProps) {
  // ─── STATE ────────────────────────────────────────────────────────────────
  const [treeData, setTreeData] = useState<RepoTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);

  const [issues, setIssues] = useState<CleanerIssue[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning" | "suggestion">("all");
  const [sortBy, setSortBy] = useState<"file" | "severity" | "category">("severity");
  const [scanProgress, setScanProgress] = useState<{ current: string; done: number; total: number } | null>(null);
  const [scanning, setScanning] = useState(false);

  const [showCodeViewer, setShowCodeViewer] = useState(false);
  const [highlightLines, setHighlightLines] = useState<{ start: number; end: number } | null>(null);

  const [fixPreview, setFixPreview] = useState<{
    issue: CleanerIssue; oldCode: string; newCode: string;
  } | null>(null);
  const [applyingFix, setApplyingFix] = useState(false);

  const [patchLog, setPatchLog] = useState<any[]>([]);

  const codeViewerRef = useRef<HTMLDivElement>(null);

  // ─── FETCH TREE ─────────────────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const res = await fetch("/api/cleaner/tree");
      const data = await res.json();
      if (data.status === "success") {
        setTreeData(data.tree || []);
        setTotalCount(data.total_count || 0);
        setIgnoredCount(data.ignored_count || 0);
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
  }, []);

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
    setIssues([]);
    setShowCodeViewer(false);
    setScanProgress({ current: "Preparing...", done: 0, total: sourceFiles.length });

    try {
      const files = sourceFiles.map(f => ({ path: f.path, sha: f.sha }));

      // We send all files at once to the server (which handles concurrency)
      setScanProgress({ current: `Analyzing ${files.length} files...`, done: 0, total: files.length });

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
    } finally {
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

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  const isDark = theme === "dark";

  return (
    <div className="flex flex-col gap-4 relative h-full">
      {/* ─── BREADCRUMB ──────────────────────────────────────────────── */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className={isDark ? "text-slate-400" : "text-slate-600"}>cleaner agent</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-amber-400">analysis engine</span>
      </div>

      {/* ─── HEADER ROW ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-[16px] font-sans font-medium flex items-center gap-2 ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            <Sparkles className="h-4.5 w-4.5 text-amber-400" />
            <span>Static Analysis Engine</span>
          </h3>
          <p className={`text-[12px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            6-category Gemini-powered code review with auto-fix patches
          </p>
        </div>
        <button
          type="button"
          onClick={runScan}
          disabled={scanning || treeLoading}
          className="bg-amber-500 hover:bg-amber-400 text-black font-sans font-medium text-[12px] py-2 px-5 rounded-lg cursor-pointer transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {scanning ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Run Full Scan</span>
            </>
          )}
        </button>
      </div>

      {/* ─── SCAN PROGRESS ───────────────────────────────────────────── */}
      {scanProgress && (
        <div className={`rounded-lg border p-3 ${
          isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {scanProgress.current}
            </span>
            <span className={`text-[11px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {scanProgress.done}/{scanProgress.total}
            </span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${scanProgress.total > 0 ? (scanProgress.done / scanProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── SUMMARY BAR ─────────────────────────────────────────────── */}
      {issues.length > 0 && (
        <div className={`rounded-lg border p-3 flex items-center justify-between ${
          isDark ? "bg-slate-900/30 border-slate-800" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-red-400">{errorCount} errors</span>
            <span className="text-amber-400">{warningCount} warnings</span>
            <span className="text-teal-400">{suggestionCount} suggestions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {resolvedCount}/{issues.length} resolved
            </span>
            <div className={`h-1.5 w-24 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${issues.length > 0 ? (resolvedCount / issues.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN LAYOUT: TREE + CENTER ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1 min-h-0">

        {/* ─── LEFT: PROJECT TREE ──────────────────────────────────── */}
        <div className={`rounded-xl border flex flex-col md:col-span-1 overflow-hidden min-h-[300px] max-h-[600px] ${
          isDark ? "bg-[#0f1117] border-slate-800" : "bg-white border-slate-200"
        }`}>
          {/* Tree Header */}
          <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
            isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
          }`}>
            <span className={`text-[11px] font-mono font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Project Structure
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-mono ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                {totalCount} files · {ignoredCount} ignored
              </span>
              <button
                type="button"
                onClick={fetchTree}
                disabled={treeLoading}
                className={`p-0.5 rounded transition cursor-pointer ${
                  isDark ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-200 text-slate-400"
                }`}
                title="Refresh tree"
              >
                <RefreshCw className={`h-3 w-3 ${treeLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Tree Content */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0">
            {treeLoading && treeData.length === 0 ? (
              <div className={`text-[11px] font-mono py-8 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-amber-400" />
                Loading project tree...
              </div>
            ) : nestedTree.length === 0 ? (
              <div className={`text-[11px] font-mono py-8 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                No files found. Check repo settings.
              </div>
            ) : (
              nestedTree.map(node => (
                <TreeRow
                  key={node.path}
                  node={node}
                  depth={0}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  selectedFile={selectedFile}
                  onFileClick={loadFile}
                  theme={theme}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── CENTER: TODO LIST / CODE VIEWER ─────────────────────── */}
        <div className={`rounded-xl border flex flex-col md:col-span-3 overflow-hidden min-h-[300px] ${
          isDark ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-200"
        }`}>

          {showCodeViewer && selectedFile ? (
            /* ─── CODE VIEWER ──────────────────────────────────── */
            <>
              <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
                isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
              }`}>
                <span className={`font-mono text-[12px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  {selectedFile}
                </span>
                <button
                  type="button"
                  onClick={() => { setShowCodeViewer(false); setHighlightLines(null); }}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
                    isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <X className="h-3 w-3" />
                  Back to Issues
                </button>
              </div>
              <div ref={codeViewerRef} className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed select-text">
                {fileLoading ? (
                  <div className={`py-12 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Loading file...
                  </div>
                ) : (
                  codeLines.map((line) => (
                    <div
                      key={line.num}
                      id={`cleaner-line-${line.num}`}
                      className={`flex py-px ${
                        line.highlighted
                          ? "bg-amber-500/15 border-l-2 border-amber-400"
                          : isDark ? "hover:bg-slate-900/30" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-10 text-right pr-3 select-none shrink-0 ${
                        line.highlighted
                          ? "text-amber-400"
                          : isDark ? "text-slate-700" : "text-slate-300"
                      }`}>
                        {line.num}
                      </span>
                      <span className={`flex-1 whitespace-pre-wrap pr-4 ${
                        isDark ? "text-slate-300" : "text-slate-700"
                      }`}>
                        {line.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* ─── TO-DO LIST ────────────────────────────────── */
            <>
              {/* Header */}
              <div className={`px-4 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 ${
                isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
              }`}>
                <div className={`text-[12px] font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  CodeLore Clean Report · <span className="font-medium">{repoName || "custom-docs"}</span>
                  <span className={`ml-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                    · {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter tabs */}
                  {(["all", "error", "warning", "suggestion"] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilterSeverity(f)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition cursor-pointer capitalize ${
                        filterSeverity === f
                          ? f === "all"
                            ? isDark ? "bg-slate-700 text-white" : "bg-slate-800 text-white"
                            : f === "error"
                              ? "bg-red-500/20 text-red-400"
                              : f === "warning"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-teal-500/20 text-teal-400"
                          : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {f === "all" ? "All" : f + "s"}
                    </button>
                  ))}
                  <span className={`text-[9px] mx-1 ${isDark ? "text-slate-700" : "text-slate-300"}`}>|</span>
                  {/* Sort */}
                  {(["severity", "file", "category"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSortBy(s)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded transition cursor-pointer capitalize ${
                        sortBy === s
                          ? isDark ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-800"
                          : isDark ? "text-slate-600 hover:text-slate-400" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      by {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issue list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {issues.length === 0 && !scanning ? (
                  <div className={`py-16 text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    <Code2 className={`h-10 w-10 mx-auto mb-3 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
                    <p className="text-[13px] font-sans font-medium mb-1">No issues found yet</p>
                    <p className="text-[11px] font-mono">
                      Click <strong className="text-amber-400">Run Full Scan</strong> to analyze your codebase with Gemini
                    </p>
                  </div>
                ) : (
                  filteredIssues.map((issue, idx) => (
                    <TodoCard
                      key={`${issue.file}-${issue.line_start}-${issue.title}-${idx}`}
                      issue={issue}
                      index={idx}
                      theme={theme}
                      onView={() => viewIssue(issue)}
                      onFix={() => showFixPreview(issue)}
                    />
                  ))
                )}
                {filteredIssues.length === 0 && issues.length > 0 && !scanning && (
                  <div className={`py-8 text-center text-[12px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    No {filterSeverity} issues found.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── FIX PREVIEW MODAL ─────────────────────────────────────── */}
      {fixPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-xl border w-full max-w-2xl overflow-hidden shadow-2xl ${
            isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          }`}>
            {/* Modal Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between ${
              isDark ? "border-slate-800" : "border-slate-200"
            }`}>
              <div>
                <h4 className={`text-[14px] font-sans font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                  Fix Preview — {fixPreview.issue.title}
                </h4>
                <p className={`text-[11px] font-mono mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {fixPreview.issue.file} · lines {fixPreview.issue.line_start}–{fixPreview.issue.line_end}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFixPreview(null)}
                className={`p-1 rounded transition cursor-pointer ${
                  isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Diff View */}
            <div className="grid grid-cols-2 gap-0 max-h-[350px] overflow-y-auto">
              <div className={`p-3 border-r ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-2 pb-1 border-b border-red-500/20">
                  Current Code
                </div>
                <pre className={`font-mono text-[11px] whitespace-pre-wrap leading-relaxed ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  {fixPreview.oldCode}
                </pre>
              </div>
              <div className="p-3">
                <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 pb-1 border-b border-emerald-500/20">
                  Patched Code
                </div>
                <pre className={`font-mono text-[11px] whitespace-pre-wrap leading-relaxed ${
                  isDark ? "text-emerald-300" : "text-emerald-700"
                }`}>
                  {fixPreview.newCode}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-4 py-3 border-t flex items-center justify-end gap-2 ${
              isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50"
            }`}>
              <button
                type="button"
                onClick={() => setFixPreview(null)}
                className={`text-[12px] font-sans px-4 py-1.5 rounded transition cursor-pointer ${
                  isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyFix}
                disabled={applyingFix}
                className="bg-emerald-500 hover:bg-emerald-400 text-white font-sans font-medium text-[12px] px-4 py-1.5 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {applyingFix ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Apply Patch & Commit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
