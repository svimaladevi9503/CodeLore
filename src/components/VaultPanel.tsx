import React from "react";
import { Database, FolderOpen, RefreshCw, Layers, History, LayoutGrid, ServerCrash, Check, FileCode } from "lucide-react";
import { ParcleRecord, SystemInfo } from "../types";

interface VaultPanelProps {
  sysInfo: SystemInfo | null;
  parcleData: ParcleRecord | null;
  setHistoricDiffOverlay: (val: any) => void;
  setActiveTab: (val: any) => void;
  theme: "light" | "dark";
  vaultOpenOnMobile: boolean;
  setVaultOpenOnMobile: (val: boolean) => void;
  activeTab?: string;
  repoName?: string;
}

export default function VaultPanel({
  sysInfo,
  parcleData,
  setHistoricDiffOverlay,
  setActiveTab,
  theme,
  vaultOpenOnMobile,
  setVaultOpenOnMobile,
  activeTab,
  repoName = "custom-docs"
}: VaultPanelProps) {

  // Return synchronizer visual indicators
  const getSyncDotStyle = () => {
    if (!sysInfo) return "bg-slate-500 animate-pulse";
    // Simulated stale state for demonstration, default to green success
    return "bg-emerald-500 animate-pulse-dot";
  };

  const allChunks = React.useMemo(() => {
    if (!parcleData) return [];
    const list: Array<{ filename: string; section: string }> = [...parcleData.v_store];
    if (parcleData.metadata) {
      for (const [key, val] of Object.entries(parcleData.metadata)) {
        if (key.startsWith("kb:") && key !== "kb:index:manifest" && !key.endsWith(":prev")) {
          const chunk = val as any;
          if (chunk && chunk.filename) {
            list.push({
              filename: chunk.filename,
              section: chunk.header || "Section"
            });
          }
        }
      }
    }
    return list;
  }, [parcleData]);

  const getKnowledgeIndexHealth = () => {
    if (!parcleData) return { label: "Empty index", style: "w-0 bg-rose-500" };
    const size = allChunks.length;
    if (size > 10) return { label: "Fresh matrix", style: "w-full bg-emerald-500" };
    if (size > 0) return { label: "Fresh snapshot", style: "w-2/3 bg-blue-500" };
    return { label: "Empty index", style: "w-1/4 bg-amber-500" };
  };

  const indexHealth = getKnowledgeIndexHealth();

  const pendingSyncCount = React.useMemo(() => {
    try {
      const syncList = JSON.parse(localStorage.getItem("kb_pending_sync") || "[]");
      return syncList.length;
    } catch (e) {
      return 0;
    }
  }, [parcleData]);

  // ─── CLEANER PATCH LOG FROM PARCLE ──────────────────────────────────────
  const cleanerPatchLog = React.useMemo(() => {
    if (!parcleData?.metadata) return [];
    const key = `cleaner:patch_log:${repoName}`;
    const log = parcleData.metadata[key];
    return Array.isArray(log) ? log : [];
  }, [parcleData, repoName]);

  const cleanerLastScan = React.useMemo(() => {
    if (!parcleData?.metadata) return null;
    const key = `cleaner:last_scan:${repoName}`;
    return parcleData.metadata[key] || null;
  }, [parcleData, repoName]);

  const isCleanerActive = activeTab === "cleaner";

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      {/* Visual Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Database className="h-4.5 w-4.5 text-purple-400" />
          <h3 className="text-[14px] font-sans font-medium text-slate-200">
            CodeLore Vault
          </h3>
        </div>
        
        {/* Parcle sync indicator dot */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
          <span className={`h-2 w-2 rounded-full ${getSyncDotStyle()}`} />
          <span>Parcle synced</span>
        </div>
      </div>

      {!parcleData ? (
        <div className="text-[12px] font-sans font-normal text-slate-500 py-12 text-center">
          CodeLore Vault is empty. Agent actions will be remembered here after first run.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 select-none pr-1">
          
          {/* Section 1: README History */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[12px] font-mono text-slate-400">
              <History className="h-3.5 w-3.5 text-purple-400" />
              <span>Readme history</span>
            </div>

            {Object.keys(parcleData.readmes).length === 0 ? (
              <div className="text-[12px] font-sans font-normal text-slate-500 bg-slate-950/20 border border-slate-900/60 p-3 rounded text-center">
                No backup records discovered yet.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {Object.entries(parcleData.readmes).map(([key, val]: any, idx) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setHistoricDiffOverlay({
                      open: true,
                      oldContent: `Old file snapshot content block...\n\nNo README.md exist prior to git push events inside the snapshot directories.`,
                      newContent: val.content,
                      sha: val.sha
                    })}
                    className="w-full text-left p-2.5 bg-slate-950/20 border border-slate-900 hover:border-purple-500/40 hover:bg-slate-900/40 rounded transition flex items-start justify-between gap-3 font-mono text-[11px] leading-snug cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-300 font-medium truncate">{val.author || "system-hook"}</div>
                      <div className="text-slate-500 truncate text-[10px] mt-0.5">Commit snapshot revision</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-blue-400 block font-medium">#{val.sha ? val.sha.substring(0, 5) : "45a8" + idx}</span>
                      <span className="text-[10px] text-slate-650 block mt-0.5">{val.timestamp ? val.timestamp.split("T")[0] : "just now"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-900 border-none" />

          {/* Section 2: Knowledge Index or Cleaner Patch Log */}
          {isCleanerActive ? (
            /* ─── CLEANER PATCH LOG ──────────────────────────────────── */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[12px] font-mono text-slate-400">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Cleaner patch log</span>
              </div>

              {/* Last scan summary */}
              {cleanerLastScan && (
                <div className="bg-slate-950/20 border border-slate-900 p-2.5 rounded-lg flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Last scan:</span>
                    <span className="text-slate-400">
                      {cleanerLastScan.timestamp ? new Date(cleanerLastScan.timestamp).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Issues found:</span>
                    <span className="text-amber-400 font-medium">{cleanerLastScan.total_issues || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Files scanned:</span>
                    <span className="text-slate-300">{cleanerLastScan.files_scanned || 0}</span>
                  </div>
                </div>
              )}

              {/* Applied patches list */}
              {cleanerPatchLog.length === 0 ? (
                <div className="text-[11px] text-slate-650 font-mono py-2 text-center">
                  No patches applied yet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {cleanerPatchLog.slice(-8).reverse().map((patch: any, idx: number) => (
                    <div
                      key={`patch-${idx}`}
                      className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded font-mono text-[10px] flex items-start gap-2"
                    >
                      <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-emerald-400 font-medium truncate">{patch.title || "Code fix"}</div>
                        <div className="text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <FileCode className="h-2.5 w-2.5" />
                          <span>{patch.file}</span>
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          {patch.timestamp ? new Date(patch.timestamp).toLocaleDateString() : "—"}
                          {patch.category && (
                            <span className="ml-1.5 text-[8px] px-1 py-px rounded bg-slate-800 text-slate-400 uppercase">
                              {patch.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ─── KNOWLEDGE INDEX (default) ──────────────────────────── */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[12px] font-mono text-slate-400">
                <LayoutGrid className="h-3.5 w-3.5 text-purple-400" />
                <span>Knowledge index</span>
              </div>

              <div className="bg-slate-950/20 border border-slate-900 p-2.5 rounded-lg flex flex-col gap-2">
                {pendingSyncCount > 0 && (
                  <div className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse select-none">
                    <ServerCrash className="h-3 w-3" />
                    <span>{pendingSyncCount} file pending sync</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-mono select-none">
                  <span className="text-slate-500">Stored chunks:</span>
                  <span className="text-slate-300 font-medium">{allChunks.length} memory arrays</span>
                </div>

                {/* Index health micro bar indicator */}
                <div className="flex flex-col gap-1 mt-0.5 select-none">
                  <div className="flex justify-between items-center text-[10px] text-slate-550 font-mono">
                    <span>Index health</span>
                    <span className="capitalize">{indexHealth.label}</span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden w-full">
                    <div className={`h-full ${indexHealth.style}`} />
                  </div>
                </div>

                {allChunks.length === 0 ? (
                  <div className="text-[11px] text-slate-650 font-mono py-2 text-center">No catalog indexed.</div>
                ) : (
                  <div className="space-y-1.5 border-t border-slate-900 pt-2.5 mt-1">
                    {allChunks.slice(-5).map((ch, chIdx) => (
                      <button
                        type="button"
                        key={`vault-chunk-${ch.filename}-${ch.section}-${chIdx}`}
                        onClick={() => {
                          setActiveTab("kb");
                        }}
                        className="w-full text-left truncate text-[11px] font-mono text-slate-400 hover:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>📂</span>
                        <span className="truncate">{ch.filename} › {ch.section}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-px bg-slate-900 border-none" />

          {/* Section 3: Patch Log */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[12px] font-mono text-slate-400">
              <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
              <span>Patch log</span>
            </div>

            {/* Dynamic Patch Log */}
            {cleanerPatchLog.length === 0 ? (
              <div className="text-[11px] text-slate-650 font-mono py-2 text-center bg-slate-950/20 border border-slate-900 rounded">
                No patches applied yet.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto">
                {cleanerPatchLog.slice(-3).reverse().map((patch: any, idx: number) => (
                  <button 
                    key={`patch-history-${idx}`}
                    type="button"
                    onClick={() => setActiveTab("cleaner")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveTab("cleaner");
                      }
                    }}
                    className="w-full text-left p-2.5 bg-slate-950/20 border border-slate-900 hover:border-purple-500/40 rounded transition flex items-center justify-between gap-3 font-mono text-[11px] leading-snug cursor-pointer select-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-300 font-medium truncate">{patch.title || "AST scanning report"}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5 truncate">
                        <FileCode className="h-2.5 w-2.5 inline mr-1" />
                        {patch.file}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-amber-500 block font-medium">{patch.category || "suggested"}</span>
                      <span className="text-[10px] text-slate-650 block mt-0.5">
                        {patch.timestamp ? new Date(patch.timestamp).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
