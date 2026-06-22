/* eslint-disable react-doctor/dangerous-html-sink */
import React from "react";
import { Eye } from "lucide-react";
import { marked } from "marked";

import DOMPurify from "dompurify";
import parse from "html-react-parser";

function parseMarkdown(md: string): string {
  try {
    const html = marked.parse(md) as string;
    return DOMPurify.sanitize(html);
  } catch (err) {
    console.error("Markdown parsing failed", err);
    return md;
  }
}

interface ReadmeDraftPreviewProps {
  theme: "light" | "dark";
  draftContent: string;
  previewMode: "code" | "preview";
  setPreviewMode: (val: "code" | "preview") => void;
}

export default function ReadmeDraftPreview({
  theme,
  draftContent,
  previewMode,
  setPreviewMode
}: ReadmeDraftPreviewProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h4
          className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <Eye className="h-4 w-4 text-teal-400" />
          <span>README Draft Preview</span>
        </h4>
        <div
          className={`flex rounded-lg p-0.5 border text-[11px] font-mono ${
            theme === "dark" ? "bg-slate-950 border-slate-850" : "bg-slate-550/10 border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setPreviewMode("code")}
            className={`px-2 py-1 rounded cursor-pointer transition ${
              previewMode === "code"
                ? theme === "dark"
                  ? "bg-teal-500/10 text-teal-400 font-medium"
                  : "bg-white text-teal-700 font-semibold shadow-sm"
                : theme === "dark"
                ? "text-slate-500 hover:text-slate-350"
                : "text-slate-450 hover:text-slate-700"
            }`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("preview")}
            className={`px-2 py-1 rounded cursor-pointer transition ${
              previewMode === "preview"
                ? theme === "dark"
                  ? "bg-teal-500/10 text-teal-400 font-medium"
                  : "bg-white text-teal-700 font-semibold shadow-sm"
                : theme === "dark"
                ? "text-slate-500 hover:text-slate-350"
                : "text-slate-450 hover:text-slate-700"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div
        className={`p-4 rounded-xl border prose prose-invert overflow-y-auto max-h-[460px] h-full min-h-[300px] select-text text-[12.5px] leading-relaxed ${
          theme === "dark"
            ? "bg-slate-950/20 border-slate-850 text-slate-300"
            : "bg-slate-550/10 border-slate-200 text-slate-800"
        }`}
      >
        {previewMode === "code" ? (
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-350 select-text">
            {draftContent}
          </pre>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed">
            {parse(parseMarkdown(draftContent))}
          </div>
        )}
      </div>
    </div>
  );
}
