import { useState, useEffect, useRef, useMemo } from 'react';

export function useKnowledgeBase(repoName: string, fetchDiagnostics: () => Promise<void>) {
  const [repoContext, setRepoContext] = useState<{
    active_repo: string;
    active_branch: string;
    last_indexed_file: string;
    owner: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // Ingestion States
  const [ingestPath, setIngestPath] = useState("");
  const [ingestionState, setIngestionState] = useState<"idle" | "fetching" | "chunking" | "indexed" | "error">("idle");
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Refs to track timers so they can be cleaned up on unmount
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel any in-flight timers when the component unmounts
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  const fetchRepoContext = async (isPoll = false) => {
    if (!isPoll) setIsSyncing(true);
    try {
      const res = await fetch("/api/orchestrate/context");
      const data = await res.json();
      if (data.status === "success" && data.context) {
        setRepoContext(data.context);
      }
    } catch (err) {
      console.error("Failed to fetch repo context:", err);
    } finally {
      if (!isPoll) setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Single fetch on mount — App.tsx owns the 5s repo-switch polling loop
    fetchRepoContext(false);

    // Sync pending sync items
    const syncList = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]");
    setPendingSyncCount(syncList.length);
  }, []);

  const handleIngest = async (filePath: string) => {
    setIngestError(null);
    setIngestionState("fetching");
    // Pulse animation flow
    await new Promise(r => setTimeout(r, 800));
    setIngestionState("chunking");
    
    const token = localStorage.getItem("github_token");
    try {
      const res = await fetch("/api/kb/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, github_token: token })
      });
      
      if (!res.ok) {
        throw new Error("Could not reach GitHub");
      }
      
      const data = await res.json();
      if (data.status === "success") {
        setIngestionState("indexed");
        await fetchDiagnostics();
        await fetchRepoContext(true);  // refresh last_indexed_file pill
        setIngestPath("");
        // Fix #7: track idle reset timer so it can be cancelled on unmount
        idleTimerRef.current = setTimeout(() => setIngestionState("idle"), 3000);
      } else {
        throw new Error(data.error || "Ingestion failed");
      }
    } catch (err: any) {
      console.error("Ingestion failed", err);
      setIngestionState("error");
      setIngestError("[!] Could not reach GitHub. Retry ↺");
      
      // Fallback: cache temporarily
      const pendingSync = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]");
      if (!pendingSync.includes(filePath)) {
        pendingSync.push(filePath);
        localStorage.setItem("kb_pending_sync", JSON.stringify(pendingSync));
      }
      setPendingSyncCount(pendingSync.length);

      // Fix #8: store retry interval ref so it's cleared on unmount
      let retries = 0;
      retryTimerRef.current = setInterval(async () => {
        retries++;
        try {
          const retryRes = await fetch("/api/kb/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: filePath, github_token: token })
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData.status === "success") {
              if (retryTimerRef.current) clearInterval(retryTimerRef.current);
              const currPending = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]").filter((f: string) => f !== filePath);
              localStorage.setItem("kb_pending_sync", JSON.stringify(currPending));
              setPendingSyncCount(currPending.length);
              await fetchDiagnostics();
            }
          }
        } catch (e) {
          console.error("Retry failed", e);
        }
        if (retries >= 3) {
          if (retryTimerRef.current) clearInterval(retryTimerRef.current);
          setIngestError("[!] All retries exhausted. Re-ingest manually when network is available.");
        }
      }, 15000);
    }
  };

  const isPillLoading = isSyncing && !repoContext;

  const { displayText, linkUrl } = useMemo(() => {
    if (isPillLoading) {
      return {
        displayText: "syncing...",
        linkUrl: "#"
      };
    }
    
    const repo = repoContext?.active_repo || repoName;
    const branch = repoContext?.active_branch || "main";
    const file = repoContext?.last_indexed_file;
    const owner = repoContext?.owner || "svimaladevi9503";
    const baseRepoUrl = `https://github.com/${owner}/${repo}`;
    
    if (!file) {
      return {
        displayText: `${repo}/ —`,
        linkUrl: baseRepoUrl
      };
    }
    
    const normalizedPath = file.replace(/\\/g, "/");
    const parts = normalizedPath.split("/");
    const fileName = parts.pop() || "";
    const folderName = parts.join("/");
    
    const formattedPath = folderName 
      ? `${repo}/${folderName}/${fileName}`
      : `${repo}/${fileName}`;
      
    const fileLink = `${baseRepoUrl}/blob/${branch}/${normalizedPath}`;
    
    return {
      displayText: formattedPath,
      linkUrl: fileLink
    };
  }, [repoContext, repoName, isPillLoading]);

  return {
    repoContext,
    setRepoContext,
    isSyncing,
    ingestPath,
    setIngestPath,
    ingestionState,
    ingestError,
    pendingSyncCount,
    handleIngest,
    isPillLoading,
    displayText,
    linkUrl
  };
}
