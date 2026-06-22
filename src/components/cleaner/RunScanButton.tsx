import React from "react";
import { Play, RefreshCw } from "lucide-react";

export interface RunScanButtonProps {
  scanning: boolean;
  disabled?: boolean;
  onRunScan: () => void;
  className?: string;
}

export function RunScanButton({ scanning, disabled, onRunScan, className = "" }: RunScanButtonProps) {
  return (
    <button
      type="button"
      onClick={onRunScan}
      disabled={scanning || disabled}
      className={`bg-amber-500 hover:bg-amber-400 text-black font-sans font-medium text-[12px] py-2 px-5 rounded-lg cursor-pointer transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${className}`}
    >
      {scanning ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Scanning...</span>
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" />
          <span>Run Full Scan</span>
        </>
      )}
    </button>
  );
}
