import React from "react";

interface DeleteConfirmationModalProps {
  theme: "light" | "dark";
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  theme,
  onCancel,
  onConfirm
}: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`rounded-xl border p-5 flex flex-col gap-4 w-full max-w-sm shadow-2xl ${
          theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <h4
            className={`text-[14px] font-sans font-medium ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}
          >
            Delete README.md?
          </h4>
          <p
            className={`text-[12px] font-sans font-normal ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            This will permanently delete the repository's README.md file. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium border transition cursor-pointer ${
              theme === "dark"
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
          >
            Delete README
          </button>
        </div>
      </div>
    </div>
  );
}
