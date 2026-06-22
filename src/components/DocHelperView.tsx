import React, { useState, useEffect } from "react";
import { marked } from "marked";
import { 
  GitBranch, 
  ChevronRight, 
  ChevronDown,
  Sparkles, 
  Check, 
  Trash2, 
  Loader2, 
  Eye, 
  MessageSquare, 
  Send, 
  GitPullRequest, 
  Settings, 
  AlertCircle,
  FileText
} from "lucide-react";
import { m, AnimatePresence } from "motion/react";

// --- Types ---
interface DropdownOption { value: string; label: string; }

interface CustomDropdownProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  theme: "light" | "dark";
}

interface DocHelperViewProps {
  theme: "light" | "dark";
  repoName: string;
  setRepoName: (val: string) => void;
  fetchDiagnostics?: () => void;
  token: string;
  ghUser: { login: string; avatar_url: string } | null;
  ghRepos: Array<{ id: number; name: string; full_name: string }>;
}

// --- Utils ---
function parseMarkdown(md: string): string {
  try { return marked.parse(md) as string; } 
  catch (err) { console.error("Markdown parsing failed", err); return md; }
}

const headerStyleOptions = [
  { value: "classic", label: "Classic (Default)" },
  { value: "clean", label: "Clean Minimalist" },
  { value: "modern", label: "Modern Visual" },
  { value: "compact", label: "Compact Overview" },
  { value: "console", label: "Terminal Console" },
  { value: "ascii", label: "Ascii Banner Header" }
];

const badgeStyleOptions = [
  { value: "default", label: "Default Shield Badges" },
  { value: "flat", label: "Flat Square Badges" },
  { value: "flat-square", label: "Flat Square Minimal" },
  { value: "for-the-badge", label: "Big Banner Badges" },
  { value: "plastic", label: "3D Plastic Badges" },
  { value: "skills", label: "Technical Skill Badges" },
  { value: "social", label: "Social Interaction Style" }
];

const emojisOptions = [
  { value: "default", label: "Default Developer Pack" },
  { value: "minimal", label: "Minimal / None" },
  { value: "ascension", label: "Ascension Glowing" },
  { value: "harmony", label: "Harmony Flow" },
  { value: "monochrome", label: "Monochrome Minimal" },
  { value: "unicode", label: "Standard Unicode Emojis" },
  { value: "water", label: "Nature / Water Elements" },
  { value: "vintage", label: "Classic Vintage Emojis" },
  { value: "zen", label: "Zen Meditative Emojis" }
];

const alignOptions = [
  { value: "center", label: "Centered" },
  { value: "left", label: "Left Aligned" },
  { value: "right", label: "Right Aligned" }
];

const navigationStyleOptions = [
  { value: "bullet", label: "Standard Bullets" },
  { value: "accordion", label: "Accordion Toggle markup" },
  { value: "number", label: "Numeric index" },
  { value: "roman", label: "Roman Numerals" }
];

// --- Custom Hooks ---
function useGenerationProgress(generating: boolean) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          const diff = Math.max(1, Math.floor((98 - prev) / 12));
          return prev + diff;
        });
      }, 400);
    } else {
      setProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [generating]);
  return progress;
}

function useDocHelperLogic(props: DocHelperViewProps) {
  const { token, repoName, ghUser, ghRepos, fetchDiagnostics } = props;

  // State Declarations
  const [readmeExists, setReadmeExists] = useState<boolean | null>(null);
  const [readmeContent, setReadmeContent] = useState("");
  const [readmeSha, setReadmeSha] = useState("");
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [readmeError, setReadmeError] = useState("");

  const [align, setAlign] = useState("center");
  const [badgeStyle, setBadgeStyle] = useState("default");
  const [headerStyle, setHeaderStyle] = useState("classic");
  const [navigationStyle, setNavigationStyle] = useState("bullet");
  const [emojis, setEmojis] = useState("default");

  const [draftContent, setDraftContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [commitMessage, setCommitMessage] = useState("chore: update README.md via CodeLore AI");
  
  const [chatInput, setChatInput] = useState("");
  const [chatLogs, setChatLogs] = useState<Array<{ sender: "user" | "gemini"; text: string }>>([
    { sender: "gemini", text: "I can modify your draft README. Ask me to add sections, change instructions, or reformat text." }
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [previewMode, setPreviewMode] = useState<"code" | "preview">("code");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const checkReadmeStatus = async () => {
    if (!token || !repoName || !ghUser) {
      setReadmeExists(null);
      setReadmeContent("");
      setReadmeSha("");
      return;
    }
    setLoadingReadme(true);
    setReadmeError("");
    try {
      const selected = ghRepos.find(r => r.name === repoName);
      const fullName = selected ? selected.full_name : `${ghUser.login}/${repoName}`;
      const res = await fetch(`/api/github/readme?token=${token}&repo=${fullName}`);
      if (!res.ok) throw new Error("Failed to query repository README file");
      const data = await res.json();
      if (data.exists) {
        setReadmeExists(true);
        setReadmeContent(data.content);
        setDraftContent(data.content);
        setReadmeSha(data.sha);
        setShowSettings(false);
      } else {
        setReadmeExists(false);
        setReadmeContent("");
        setDraftContent("");
        setReadmeSha("");
        setShowSettings(true);
      }
    } catch (err: any) {
      setReadmeError(err.message || "Failed to parse repository README");
      setReadmeExists(null);
    } finally {
      setLoadingReadme(false);
    }
  };

  useEffect(() => {
    if (token && repoName && ghUser) checkReadmeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoName, token, ghUser]);

  const handleDeleteReadme = async () => {
    if (!token || !repoName || !ghUser || !readmeSha) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    setConfirmDeleteOpen(false);
    setDeleting(true);
    try {
      const selected = ghRepos.find(r => r.name === repoName);
      const fullName = selected ? selected.full_name : `${ghUser!.login}/${repoName}`;
      const res = await fetch("/api/github/delete-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, repo: fullName, sha: readmeSha })
      });
      if (!res.ok) throw new Error("Failed to delete remote file");
      setReadmeExists(false);
      setReadmeContent("");
      setDraftContent("");
      setReadmeSha("");
      showToast("success", "README.md deleted from repository.");
      if (fetchDiagnostics) fetchDiagnostics();
    } catch (err: any) {
      showToast("error", err.message || "Deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateReadme = async () => {
    if (!token || !repoName || !ghUser) return;
    setGenerating(true);
    try {
      const selected = ghRepos.find(r => r.name === repoName);
      const fullName = selected ? selected.full_name : `${ghUser.login}/${repoName}`;
      
      const res = await fetch("/api/readme/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, repo: fullName, repoName, align, badgeStyle, headerStyle, navigationStyle, emojis
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run readme-ai generator");
      setDraftContent(data.content);
      setChatLogs([{ sender: "gemini", text: "Successfully generated the template using readme-ai! Review the preview on the right. You can request specific text refinements or add custom sections here." }]);
    } catch (err: any) {
      showToast("error", err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !draftContent || refining) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatLogs(prev => [...prev, { sender: "user", text: userText }]);
    setRefining(true);

    try {
      const res = await fetch("/api/readme/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent, instruction: userText })
      });
      if (!res.ok) throw new Error("Failed to refine text");
      const data = await res.json();
      setDraftContent(data.content);
      setChatLogs(prev => [...prev, { sender: "gemini", text: "Refined draft successfully. Changes are applied to the preview." }]);
    } catch (err: any) {
      setChatLogs(prev => [...prev, { sender: "gemini", text: `Error modifying README: ${err.message || "Connection failed"}` }]);
    } finally {
      setRefining(false);
    }
  };

  const handlePushReadme = async () => {
    if (!token || !repoName || !ghUser || !draftContent) return;
    setPushing(true);
    try {
      const selected = ghRepos.find(r => r.name === repoName);
      const fullName = selected ? selected.full_name : `${ghUser.login}/${repoName}`;
      
      const res = await fetch("/api/github/push-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, repo: fullName, content: draftContent,
          sha: readmeExists ? readmeSha : undefined,
          message: commitMessage
        })
      });
      if (!res.ok) throw new Error("Commit push rejected by remote GitHub server");
      const data = await res.json();
      showToast("success", "Successfully pushed README.md to your repository!");
      
      setReadmeExists(true);
      setReadmeContent(draftContent);
      setReadmeSha(data.commit.sha);
      
      if (fetchDiagnostics) fetchDiagnostics();
    } catch (err: any) {
      showToast("error", err.message || "Failed to commit changes");
    } finally {
      setPushing(false);
    }
  };

  return {
    state: {
      readmeExists, loadingReadme, readmeError, showSettings, toast, confirmDeleteOpen,
      align, badgeStyle, headerStyle, navigationStyle, emojis,
      generating, draftContent, previewMode, chatLogs, chatInput, refining,
      commitMessage, pushing, deleting
    },
    actions: {
      setAlign, setBadgeStyle, setHeaderStyle, setNavigationStyle, setEmojis,
      setChatInput, setCommitMessage, setPreviewMode, setShowSettings, setToast, setConfirmDeleteOpen,
      handleDeleteReadme, confirmDelete, handleGenerateReadme, handleSendChat, handlePushReadme
    }
  };
}

// --- UI Components ---

function CustomDropdown({ label, options, value, onChange, theme }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1.5 relative w-full font-sans">
      <span className={`text-[10.5px] font-mono uppercase tracking-wider ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}>{label}</span>
      
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-[12.5px] font-sans font-medium cursor-pointer transition-all outline-none w-full ${
          open
            ? "border-teal-500 bg-teal-500/5 text-teal-400"
            : theme === "dark"
              ? "border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-200"
              : "border-slate-200 bg-white hover:border-slate-350 text-slate-800"
        }`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
          open ? "rotate-180 text-teal-400" : theme === "dark" ? "text-slate-500" : "text-slate-450"
        }`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <m.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={`absolute top-full mt-1.5 left-0 right-0 z-50 rounded-lg border overflow-hidden shadow-xl ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-800"
                  : "bg-white border-slate-200"
              }`}
              style={{ maxHeight: 200, overflowY: "auto" }}
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 text-[12px] font-sans transition-colors cursor-pointer ${
                      isSelected
                        ? theme === "dark"
                          ? "bg-teal-500/10 text-teal-350"
                          : "bg-teal-50 text-teal-700"
                        : theme === "dark"
                          ? "text-slate-300 hover:bg-slate-800"
                          : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-teal-400" />
                    )}
                  </button>
                );
              })}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToastNotification({ toast, onClose }: { toast: { type: "success" | "error"; text: string }; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-[12px] font-sans font-medium max-w-sm animate-fade-in ${
      toast.type === "success"
        ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200"
        : "bg-red-900/90 border-red-500/40 text-red-200"
    }`}>
      <span>{toast.type === "success" ? "✓" : "✗"}</span>
      <span className="flex-1">{toast.text}</span>
      <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100 cursor-pointer text-inherit">✕</button>
    </div>
  );
}

function DeleteConfirmationModal({ theme, onCancel, onConfirm }: { theme: "light" | "dark", onCancel: () => void, onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`rounded-xl border p-5 flex flex-col gap-4 w-full max-w-sm shadow-2xl ${
        theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <div className="flex flex-col gap-1.5">
          <h4 className={`text-[14px] font-sans font-medium ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
            Delete README.md?
          </h4>
          <p className={`text-[12px] font-sans font-normal ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
            This will permanently delete the repository's README.md file. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium border transition cursor-pointer ${
              theme === "dark" ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
          >
            Delete README
          </button>
        </div>
      </div>
    </div>
  );
}

function DocHelperHeader({ theme }: { theme: "light" | "dark" }) {
  return (
    <>
      <div className={`text-[12px] font-mono tracking-tight flex items-center gap-1 ${
        theme === "dark" ? "text-slate-500" : "text-slate-400"
      }`}>
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className={theme === "dark" ? "text-slate-400" : "text-slate-650"}>documentation helper</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-teal-400">AI Readme Generator</span>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4">
        <div>
          <h3 className={`text-[16px] font-sans font-medium flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            <GitBranch className="h-4.5 w-4.5 text-teal-400" />
            <span>AI Readme Generator</span>
          </h3>
          <p className={`text-[12px] mt-1 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Scan your codebase structures, select customization layouts, and generate premium interactive README files powered by Eli64s' Readme-AI engine.
          </p>
        </div>
      </div>
    </>
  );
}

function EmptyStateWarning({ theme, hasToken }: { theme: "light" | "dark", hasToken: boolean }) {
  return (
    <div className={`border border-dashed rounded-lg p-10 text-center text-[12px] font-sans font-normal ${
      theme === "dark"
        ? "border-slate-850 text-slate-500"
        : "border-slate-200 text-slate-450 bg-slate-50/50"
    }`}>
      {!hasToken 
        ? "GitHub connection required. Please authorize on the general orchestrator view first." 
        : "Select a repository context on the orchestrator view to begin documenting."}
    </div>
  );
}

function ReadmeStatusPanel({ theme, loadingReadme, readmeError, readmeExists, showSettings, onToggleSettings, onDeleteClick, deleting }: any) {
  return (
    <div className={`rounded-xl p-4 md:p-5 border flex flex-col gap-4 ${
      theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-white border-slate-200"
    }`}>
      <h4 className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-2 ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}>
        <FileText className="h-4 w-4 text-teal-400" />
        <span>Repository README Status</span>
      </h4>

      {loadingReadme ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
          <span className={`text-[11px] font-mono ${theme === "dark" ? "text-slate-550" : "text-slate-450"}`}>Scanning GitHub files...</span>
        </div>
      ) : readmeError ? (
        <div className="text-[11px] font-mono text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{readmeError}</span>
        </div>
      ) : readmeExists === true ? (
        <div className="flex flex-col gap-3">
          <div className={`flex items-center justify-between border p-3 rounded-lg ${
            theme === "dark" ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
          }`}>
            <span className={`text-[12px] font-medium flex items-center gap-1.5 ${
              theme === "dark" ? "text-emerald-400" : "text-emerald-650"
            }`}>
              <Check className="h-4 w-4 text-emerald-500" />
              README.md exists on GitHub
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleSettings}
                className={`p-1.5 rounded transition flex items-center gap-1 text-[11px] font-mono cursor-pointer ${
                  theme === "dark" ? "text-slate-450 hover:text-teal-400 hover:bg-slate-900 border border-slate-800" : "text-slate-450 hover:text-teal-650 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>{showSettings ? "Hide Settings" : "Configure & Regenerate"}</span>
              </button>
              <button
                type="button"
                onClick={onDeleteClick}
                disabled={deleting}
                className={`p-1.5 rounded transition flex items-center gap-1 text-[11px] font-mono cursor-pointer ${
                  theme === "dark" ? "text-slate-500 hover:text-red-400 hover:bg-slate-900 border border-slate-800" : "text-slate-450 hover:text-red-650 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete File</span>
              </button>
            </div>
          </div>
          {showSettings && (
            <p className={`text-[11px] leading-relaxed ${theme === "dark" ? "text-slate-500" : "text-slate-450"}`}>
              To update this README, configure the styles below and click "Regenerate". The tool will keep tracking this file's version key.
            </p>
          )}
        </div>
      ) : readmeExists === false ? (
        <div className={`border p-3.5 rounded-lg flex flex-col gap-1 bg-transparent ${
          theme === "dark" ? "border-red-500/40" : "border-red-600/40"
        }`}>
          <span className={`text-[12px] font-semibold flex items-center gap-1.5 ${
            theme === "dark" ? "text-red-400" : "text-red-605"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            README.md not discovered
          </span>
          <p className={`text-[11.5px] leading-relaxed mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            This repository lacks a root README.md. Use the configurations below to generate a new file.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReadmeAiSettings({ theme, headerStyle, setHeaderStyle, badgeStyle, setBadgeStyle, emojis, setEmojis, align, setAlign, navigationStyle, setNavigationStyle, onGenerate, generating, readmeExists }: any) {
  const progress = useGenerationProgress(generating);

  return (
    <div className={`rounded-xl p-4 md:p-5 border flex flex-col gap-4 ${
      theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-white border-slate-200"
    }`}>
      <h4 className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-2 ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}>
        <Settings className="h-4 w-4 text-teal-400 animate-pulse" />
        <span>Readme-AI Settings</span>
      </h4>

      <div className="flex flex-col gap-4 font-sans">
        <CustomDropdown label="Header template style" options={headerStyleOptions} value={headerStyle} onChange={setHeaderStyle} theme={theme} />
        <CustomDropdown label="Badge icon style type" options={badgeStyleOptions} value={badgeStyle} onChange={setBadgeStyle} theme={theme} />
        <CustomDropdown label="Emoji theme pack" options={emojisOptions} value={emojis} onChange={setEmojis} theme={theme} />
        <CustomDropdown label="Header Text alignment" options={alignOptions} value={align} onChange={setAlign} theme={theme} />
        <CustomDropdown label="Navigation index style" options={navigationStyleOptions} value={navigationStyle} onChange={setNavigationStyle} theme={theme} />

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className={`mt-2 px-4 py-2.5 rounded-lg font-sans text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-sm border ${
            theme === "dark"
              ? "bg-slate-900 border-teal-500/85 hover:bg-slate-850 text-teal-300"
              : "bg-white border-teal-550 hover:bg-teal-50/50 text-teal-700"
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-teal-650" />
              <span>Generating README ({progress}%)...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-teal-650" />
              <span>{readmeExists ? "Regenerate README" : "Generate README"}</span>
            </>
          )}
        </button>

        {generating && (
          <div className="flex flex-col gap-1.5 mt-2 font-sans">
            <div className="flex justify-between items-center text-[10.5px] font-mono">
              <span className={theme === "dark" ? "text-slate-450" : "text-slate-500"}>
                {progress < 25 ? "Cloning repository..." : progress < 55 ? "Analyzing project structure..." : progress < 80 ? "Generating documentation..." : "Polishing final layout..."}
              </span>
              <span className="text-teal-400 font-semibold">{progress}%</span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-900" : "bg-slate-100"}`}>
              <m.div
                className="h-full bg-teal-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadmeDraftPreview({ theme, draftContent, previewMode, setPreviewMode }: any) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h4 className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}>
          <Eye className="h-4 w-4 text-teal-400" />
          <span>README Draft Preview</span>
        </h4>
        <div className={`flex rounded-lg p-0.5 border text-[11px] font-mono ${
          theme === "dark" ? "bg-slate-950 border-slate-850" : "bg-slate-550/10 border-slate-200"
        }`}>
          <button
            type="button"
            onClick={() => setPreviewMode("code")}
            className={`px-2 py-1 rounded cursor-pointer transition ${
              previewMode === "code"
                ? theme === "dark" ? "bg-teal-500/10 text-teal-400 font-medium" : "bg-white text-teal-700 font-semibold shadow-sm"
                : theme === "dark" ? "text-slate-500 hover:text-slate-350" : "text-slate-450 hover:text-slate-700"
            }`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("preview")}
            className={`px-2 py-1 rounded cursor-pointer transition ${
              previewMode === "preview"
                ? theme === "dark" ? "bg-teal-500/10 text-teal-400 font-medium" : "bg-white text-teal-700 font-semibold shadow-sm"
                : theme === "dark" ? "text-slate-500 hover:text-slate-350" : "text-slate-450 hover:text-slate-700"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className={`p-4 rounded-xl border prose prose-invert overflow-y-auto max-h-[460px] h-full min-h-[300px] select-text text-[12.5px] leading-relaxed ${
        theme === "dark"
          ? "bg-slate-950/20 border-slate-850 text-slate-300"
          : "bg-slate-50/40 border-slate-200 text-slate-800"
      }`}>
        {previewMode === "code" ? (
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-350 select-text">
            {draftContent}
          </pre>
        ) : (
          <div 
            className="markdown-body select-text" 
            dangerouslySetInnerHTML={{ __html: parseMarkdown(draftContent) }} 
          />
        )}
      </div>
    </div>
  );
}

function GeminiRefinerChat({ theme, chatLogs, chatInput, setChatInput, onSendChat, refining }: any) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <h4 className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}>
        <MessageSquare className="h-4 w-4 text-teal-400 animate-bounce" />
        <span>Gemini Refiner Chat</span>
      </h4>

      <div className={`border rounded-xl flex flex-col justify-between max-h-[460px] h-[460px] ${
        theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-white border-slate-200"
      }`}>
        
        {/* Chat Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-[12px]">
          {chatLogs.map((msg: any, i: number) => (
            <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}>
              <span className={`text-[10px] font-mono ${
                theme === "dark" ? "text-slate-500" : "text-slate-400"
              }`}>{msg.sender === "user" ? "You" : "Gemini"}</span>
              <div className={`p-2.5 rounded-lg leading-relaxed ${
                msg.sender === "user"
                  ? theme === "dark"
                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    : "bg-purple-50 text-purple-700 border border-purple-100"
                  : theme === "dark"
                    ? "bg-slate-900 text-slate-200 border border-slate-800"
                    : "bg-slate-50 text-slate-800 border border-slate-100"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {refining && (
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] py-1">
              <Loader2 className="h-3 w-3 animate-spin text-teal-500" />
              <span>Gemini is editing markdown...</span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={onSendChat} className={`p-3 border-t flex gap-2 ${
          theme === "dark" ? "border-slate-900 bg-slate-950/20" : "border-slate-150 bg-slate-50/50"
        }`}>
          <input
            type="text"
            placeholder="Request edits..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            className={`flex-1 border rounded-lg text-[12px] font-sans px-2.5 py-1.5 outline-none focus:border-teal-500 transition ${
              theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
            }`}
          />
          <button
            type="submit"
            disabled={refining || !chatInput.trim()}
            className={`p-2 rounded-lg cursor-pointer flex items-center justify-center transition border active:scale-95 disabled:opacity-50 ${
              theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function CommitPushController({ theme, commitMessage, setCommitMessage, onPush, pushing }: any) {
  return (
    <div className={`lg:col-span-12 rounded-xl p-4.5 border flex flex-col md:flex-row items-center justify-between gap-4 mt-1 ${
      theme === "dark"
        ? "bg-slate-950/40 border-slate-850/80"
        : "bg-white border-slate-200"
    }`}>
      <div className="flex items-start gap-2.5 min-w-0 flex-1 w-full md:w-auto">
        <GitPullRequest className="h-5 w-5 text-teal-400 shrink-0 mt-1" />
        <div className="flex-grow flex flex-col gap-1 w-full">
          <span className={`text-[12.5px] font-sans font-semibold leading-none ${
            theme === "dark" ? "text-white" : "text-slate-850"
          }`}>Commit push config</span>
          <input
            type="text"
            placeholder="Commit message..."
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            className={`text-[11.5px] font-sans w-full border rounded px-2.5 py-1.5 outline-none focus:border-teal-500 mt-1 transition ${
              theme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onPush}
        disabled={pushing}
        className={`px-5 py-3.5 rounded-lg font-sans text-[12.5px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-md w-full md:w-auto ${
          theme === "dark"
            ? "bg-white text-slate-950 border border-teal-500 hover:bg-slate-100"
            : "bg-teal-650 text-white border border-teal-650 hover:bg-teal-700 shadow-teal-500/10"
        }`}
      >
        {pushing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Pushing to GitHub remote...</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            <span>Push README to repository</span>
          </>
        )}
      </button>
    </div>
  );
}

// --- Main Exported Component ---

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
