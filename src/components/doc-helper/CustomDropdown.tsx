import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { m, AnimatePresence } from "motion/react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  theme: "light" | "dark";
}

export default function CustomDropdown({
  label,
  options,
  value,
  onChange,
  theme
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1.5 relative w-full font-sans">
      <span
        className={`text-[10.5px] font-mono uppercase tracking-wider ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-[12.5px] font-sans font-medium cursor-pointer transition-all outline-none w-full ${
          open
            ? "border-teal-500 bg-teal-500/5 text-teal-400"
            : theme === "dark"
            ? "border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-200"
            : "border-slate-200 bg-white hover:border-slate-350 text-slate-800"
        }`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            open
              ? "rotate-180 text-teal-400"
              : theme === "dark"
              ? "text-slate-500"
              : "text-slate-450"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <m.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={`absolute top-full mt-1.5 left-0 right-0 z-50 rounded-lg border overflow-hidden shadow-xl ${
                theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
              style={{ maxHeight: 200, overflowY: "auto" }}
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 text-[12px] font-sans transition-colors cursor-pointer ${
                      isSelected
                        ? theme === "dark"
                          ? "bg-teal-500/10 text-teal-350"
                          : "bg-teal-50 text-teal-700"
                        : theme === "dark"
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-teal-400" />}
                  </button>
                );
              })}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
