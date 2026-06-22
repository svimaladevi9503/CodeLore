/* eslint-disable react-doctor/no-event-handler, react-doctor/no-pass-data-to-parent */
import { useState, useEffect } from "react";
import { GitHubUser, GitHubRepo } from "../orchestrator/useGitHub";

interface UseDocHelperLogicProps {
  token: string;
  repoName: string;
  ghUser: GitHubUser | null;
  ghRepos: GitHubRepo[];
  fetchDiagnostics?: () => void;
}

export function useDocHelperLogic(props: UseDocHelperLogicProps) {
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

  // eslint-disable-next-line react-doctor/no-fetch-in-effect, react-doctor/no-event-handler
  useEffect(() => {
    if (token && repoName && ghUser) checkReadmeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-doctor/exhaustive-deps
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
