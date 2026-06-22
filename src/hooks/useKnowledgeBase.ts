/* eslint-disable react-doctor/js-cache-storage */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

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
  // eslint-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  const fetchRepoContext = useCallback(async (isPoll = false) => {
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
  }, []);

  // eslint-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    fetchRepoContext(false);
    try {
      const stored = localStorage.getItem("kb_pending_sync:v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        const syncList = parsed.version === 1 ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        setPendingSyncCount(syncList.length);
      }
    } catch (e) {
      setPendingSyncCount(0);
    }
  }, [fetchRepoContext]);

  const handleIngest = useCallback(async (filePath: string) => {
    setIngestError(null);
    setIngestionState("fetching");
    await new Promise(r => setTimeout(r, 800));
    setIngestionState("chunking");
    
    const token = localStorage.getItem("gh_session");
    try {
      const res = await fetch("/api/kb/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, github_token: token })
      });
      
      if (!res.ok) throw new Error("Could not reach GitHub");
      
      const data = await res.json();
      if (data.status === "success") {
        setIngestionState("indexed");
        await fetchDiagnostics();
        await fetchRepoContext(true);
        setIngestPath("");
        idleTimerRef.current = setTimeout(() => setIngestionState("idle"), 3000);
      } else {
        throw new Error(data.error || "Ingestion failed");
      }
    } catch (err: any) {
      console.error("Ingestion failed", err);
      setIngestionState("error");
      setIngestError("[!] Could not reach GitHub. Retry ↺");
      
      try {
        const stored = localStorage.getItem("kb_pending_sync:v1");
        const parsed = stored ? JSON.parse(stored) : { version: 1, data: [] };
        const pendingSync = parsed.version === 1 ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        
        if (!pendingSync.includes(filePath)) {
          pendingSync.push(filePath);
          localStorage.setItem("kb_pending_sync:v1", JSON.stringify({ version: 1, data: pendingSync }));
        }
        setPendingSyncCount(pendingSync.length);
      } catch (e) {
        console.error("Local storage error", e);
      }

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
              try {
                const stored = localStorage.getItem("kb_pending_sync:v1");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  const currPending = (parsed.version === 1 ? parsed.data : (Array.isArray(parsed) ? parsed : [])).filter((f: string) => f !== filePath);
                  localStorage.setItem("kb_pending_sync:v1", JSON.stringify({ version: 1, data: currPending }));
                  setPendingSyncCount(currPending.length);
                }
              } catch (e) {}
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
  }, [fetchDiagnostics, fetchRepoContext]);

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
