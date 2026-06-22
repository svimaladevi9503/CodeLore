import React from "react";
import { PackageX, AlertTriangle, Rocket, Shield, LayoutList, BookOpen } from "lucide-react";

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  unused_import: <PackageX className="h-3.5 w-3.5" />,
  syntax_error: <AlertTriangle className="h-3.5 w-3.5" />,
  performance: <Rocket className="h-3.5 w-3.5" />,
  security: <Shield className="h-3.5 w-3.5" />,
  srp: <LayoutList className="h-3.5 w-3.5" />,
  readability: <BookOpen className="h-3.5 w-3.5" />,
};

export const CATEGORY_COLORS: Record<string, string> = {
  unused_import: "text-orange-400",
  syntax_error: "text-red-400",
  performance: "text-sky-400",
  security: "text-rose-400",
  srp: "text-violet-400",
  readability: "text-emerald-400",
};

export const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  error: { bg: "bg-[#E24B4A]", text: "text-white", label: "Error" },
  warning: { bg: "bg-[#EF9F27]", text: "text-slate-900", label: "Warning" },
  suggestion: { bg: "bg-[#1D9E75]", text: "text-white", label: "Suggestion" },
};
