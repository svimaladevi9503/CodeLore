import React from "react";
import { m, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface CitationDrawerProps {
  activeCitationText: string | null;
  setActiveCitationText: (val: string | null) => void;
}

const CitationDrawer = ({ activeCitationText, setActiveCitationText }: CitationDrawerProps) => {
  return (
    <AnimatePresence>
      {activeCitationText && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <m.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col gap-4 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setActiveCitationText(null)}
              aria-label="Close drawer"
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-850 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mt-8">
              <span className="text-[10px] font-mono tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                v_store vector record
              </span>
              <h4 className="text-[14px] font-sans font-medium text-white mt-3">
                Document chunk text readout
              </h4>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-lg p-3 overflow-y-auto mt-2 leading-relaxed">
              <p className="text-[12px] font-mono text-slate-300 leading-relaxed font-normal">
                {activeCitationText}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveCitationText(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-normal text-[12px] py-1.5 rounded"
              >
                Close context drawer
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CitationDrawer;
