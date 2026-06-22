import React from "react";
import { FileText, Loader2, AlertCircle, Check, Settings, Trash2 } from "lucide-react";

interface ReadmeStatusPanelProps {
  theme: "light" | "dark";
  loadingReadme: boolean;
  readmeError: string;
  readmeExists: boolean | null;
  showSettings: boolean;
  onToggleSettings: () => void;
  onDeleteClick: () => void;
  deleting: boolean;
}

export default function ReadmeStatusPanel({
  theme,
  loadingReadme,
  readmeError,
  readmeExists,
  showSettings,
  onToggleSettings,
  onDeleteClick,
  deleting
}: ReadmeStatusPanelProps) {
  return (
    <div
      className={`rounded-xl p-4 md:p-5 border flex flex-col gap-4 ${
        theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-white border-slate-200"
      }`}
    >
      <h4
        className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-2 ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <FileText className="h-4 w-4 text-teal-400" />
        <span>Repository README Status</span>
      </h4>

      {loadingReadme ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
          <span
            className={`text-[11px] font-mono ${
              theme === "dark" ? "text-slate-550" : "text-slate-450"
            }`}
          >
            Scanning GitHub files...
          </span>
        </div>
      ) : readmeError ? (
        <div className="text-[11px] font-mono text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{readmeError}</span>
        </div>
      ) : readmeExists === true ? (
        <div className="flex flex-col gap-3">
          <div
            className={`flex items-center justify-between border p-3 rounded-lg ${
              theme === "dark" ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
            }`}
          >
            <span
              className={`text-[12px] font-medium flex items-center gap-1.5 ${
                theme === "dark" ? "text-emerald-400" : "text-emerald-650"
              }`}
            >
              <Check className="h-4 w-4 text-emerald-500" />
              README.md exists on GitHub
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleSettings}
                className={`p-1.5 rounded transition flex items-center gap-1 text-[11px] font-mono cursor-pointer ${
                  theme === "dark"
                    ? "text-slate-450 hover:text-teal-400 hover:bg-slate-900 border border-slate-800"
                    : "text-slate-450 hover:text-teal-650 hover:bg-slate-50 border border-slate-200"
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
                  theme === "dark"
                    ? "text-slate-500 hover:text-red-400 hover:bg-slate-900 border border-slate-800"
                    : "text-slate-450 hover:text-red-650 hover:bg-slate-50 border border-slate-200"
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
            <p
              className={`text-[11px] leading-relaxed ${
                theme === "dark" ? "text-slate-500" : "text-slate-450"
              }`}
            >
              To update this README, configure the styles below and click "Regenerate". The tool will
              keep tracking this file's version key.
            </p>
          )}
        </div>
      ) : readmeExists === false ? (
        <div
          className={`border p-3.5 rounded-lg flex flex-col gap-1 bg-transparent ${
            theme === "dark" ? "border-red-500/40" : "border-red-600/40"
          }`}
        >
          <span
            className={`text-[12px] font-semibold flex items-center gap-1.5 ${
              theme === "dark" ? "text-red-400" : "text-red-605"
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            README.md not discovered
          </span>
          <p
            className={`text-[11.5px] leading-relaxed mt-0.5 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            This repository lacks a root README.md. Use the configurations below to generate a new
            file.
          </p>
        </div>
      ) : null}
    </div>
  );
}
