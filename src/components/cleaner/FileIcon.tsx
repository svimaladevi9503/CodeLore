import React from "react";
import { FileCode } from "lucide-react";

export function FileIcon({ filename, className = "" }: { filename: string; className?: string }) {
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
