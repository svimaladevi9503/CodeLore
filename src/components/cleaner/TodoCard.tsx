import React from "react";
import { Eye, Check, Code2 } from "lucide-react";
import { CleanerIssue } from "../../types";
import { SEVERITY_STYLES, CATEGORY_COLORS, CATEGORY_ICONS } from "./constants";

export interface TodoCardProps {
  key?: React.Key;
  issue: CleanerIssue;
  index: number;
  theme: string;
  onView: () => void;
  onFix: () => void;
}

export function TodoCard({
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
