import React from "react";

interface ToastNotificationProps {
  toast: { type: "success" | "error"; text: string };
  onClose: () => void;
}

export default function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  return (
    <div
      className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-[12px] font-sans font-medium max-w-sm animate-fade-in ${
        toast.type === "success"
          ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200"
          : "bg-red-900/90 border-red-500/40 text-red-200"
      }`}
    >
      <span>{toast.type === "success" ? "✓" : "✗"}</span>
      <span className="flex-1">{toast.text}</span>
      <button
        type="button"
        onClick={onClose}
        className="opacity-60 hover:opacity-100 cursor-pointer text-inherit"
      >
        ✕
      </button>
    </div>
  );
}
