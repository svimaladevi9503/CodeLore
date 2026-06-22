import React from "react";
import { Loader2, Play } from "lucide-react";

interface RunScanButtonProps {
  scanning: boolean;
  disabled: boolean;
  onRunScan: () => void;
}

export function RunScanButton({ scanning, disabled, onRunScan }: RunScanButtonProps) {
  return (
    <button
      type="button"
      onClick={onRunScan}
      disabled={scanning || disabled}
      aria-label={scanning ? "Scanning" : "Run full scan"}
      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-amber-950 text-[12px] font-sans font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
    >
      {scanning ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-950" />
          <span>Scanning codebase...</span>
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Run Full Scan</span>
        </>
      )}
    </button>
  );
}
