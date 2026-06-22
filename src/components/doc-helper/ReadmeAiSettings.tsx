import React, { useState, useEffect } from "react";
import { Settings, Loader2, Sparkles } from "lucide-react";
import { m } from "motion/react";
import CustomDropdown from "./CustomDropdown";

const headerStyleOptions = [
  { value: "classic", label: "Classic (Default)" },
  { value: "clean", label: "Clean Minimalist" },
  { value: "modern", label: "Modern Visual" },
  { value: "compact", label: "Compact Overview" },
  { value: "console", label: "Terminal Console" },
  { value: "ascii", label: "Ascii Banner Header" }
];

const badgeStyleOptions = [
  { value: "default", label: "Default Shield Badges" },
  { value: "flat", label: "Flat Square Badges" },
  { value: "flat-square", label: "Flat Square Minimal" },
  { value: "for-the-badge", label: "Big Banner Badges" },
  { value: "plastic", label: "3D Plastic Badges" },
  { value: "skills", label: "Technical Skill Badges" },
  { value: "social", label: "Social Interaction Style" }
];

const emojisOptions = [
  { value: "default", label: "Default Developer Pack" },
  { value: "minimal", label: "Minimal / None" },
  { value: "ascension", label: "Ascension Glowing" },
  { value: "harmony", label: "Harmony Flow" },
  { value: "monochrome", label: "Monochrome Minimal" },
  { value: "unicode", label: "Standard Unicode Emojis" },
  { value: "water", label: "Nature / Water Elements" },
  { value: "vintage", label: "Classic Vintage Emojis" },
  { value: "zen", label: "Zen Meditative Emojis" }
];

const alignOptions = [
  { value: "center", label: "Centered" },
  { value: "left", label: "Left Aligned" },
  { value: "right", label: "Right Aligned" }
];

const navigationStyleOptions = [
  { value: "bullet", label: "Standard Bullets" },
  { value: "accordion", label: "Accordion Toggle markup" },
  { value: "number", label: "Numeric index" },
  { value: "roman", label: "Roman Numerals" }
];



interface ReadmeAiSettingsProps {
  theme: "light" | "dark";
  headerStyle: string;
  setHeaderStyle: (val: string) => void;
  badgeStyle: string;
  setBadgeStyle: (val: string) => void;
  emojis: string;
  setEmojis: (val: string) => void;
  align: string;
  setAlign: (val: string) => void;
  navigationStyle: string;
  setNavigationStyle: (val: string) => void;
  onGenerate: () => void;
  generating: boolean;
  readmeExists: boolean | null;
}

export default function ReadmeAiSettings({
  theme,
  headerStyle,
  setHeaderStyle,
  badgeStyle,
  setBadgeStyle,
  emojis,
  setEmojis,
  align,
  setAlign,
  navigationStyle,
  setNavigationStyle,
  onGenerate,
  generating,
  readmeExists
}: ReadmeAiSettingsProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const diff = Math.max(1, Math.floor((98 - prev) / 12));
        return prev + diff;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = () => {
    setProgress(0);
    onGenerate();
  };

  return (
    <div
      className={`rounded-xl p-4 md:p-5 border flex flex-col gap-4 ${
        theme === "dark" ? "bg-slate-950/40 border-slate-850" : "bg-white border-slate-200"
      }`}
    >
      <h4
        className={`text-[13px] font-mono uppercase tracking-wider flex items-center gap-2 ${
          theme === "dark" ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <Settings className="h-4 w-4 text-teal-400 animate-pulse" />
        <span>Readme-AI Settings</span>
      </h4>

      <div className="flex flex-col gap-4 font-sans">
        <CustomDropdown
          label="Header template style"
          options={headerStyleOptions}
          value={headerStyle}
          onChange={setHeaderStyle}
          theme={theme}
        />
        <CustomDropdown
          label="Badge icon style type"
          options={badgeStyleOptions}
          value={badgeStyle}
          onChange={setBadgeStyle}
          theme={theme}
        />
        <CustomDropdown
          label="Emoji theme pack"
          options={emojisOptions}
          value={emojis}
          onChange={setEmojis}
          theme={theme}
        />
        <CustomDropdown
          label="Header Text alignment"
          options={alignOptions}
          value={align}
          onChange={setAlign}
          theme={theme}
        />
        <CustomDropdown
          label="Navigation index style"
          options={navigationStyleOptions}
          value={navigationStyle}
          onChange={setNavigationStyle}
          theme={theme}
        />

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className={`mt-2 px-4 py-2.5 rounded-lg font-sans text-[12px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 shadow-sm border ${
            theme === "dark"
              ? "bg-slate-900 border-teal-500/85 hover:bg-slate-850 text-teal-300"
              : "bg-white border-teal-550 hover:bg-teal-50/50 text-teal-700"
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-teal-650" />
              <span>Generating README ({progress}%)...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-teal-650" />
              <span>{readmeExists ? "Regenerate README" : "Generate README"}</span>
            </>
          )}
        </button>

        {generating && (
          <div className="flex flex-col gap-1.5 mt-2 font-sans">
            <div className="flex justify-between items-center text-[10.5px] font-mono">
              <span className={theme === "dark" ? "text-slate-450" : "text-slate-500"}>
                {progress < 25
                  ? "Cloning repository..."
                  : progress < 55
                  ? "Analyzing project structure..."
                  : progress < 80
                  ? "Generating documentation..."
                  : "Polishing final layout..."}
              </span>
              <span className="text-teal-400 font-semibold">{progress}%</span>
            </div>
            <div
              className={`w-full h-1.5 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-slate-900" : "bg-slate-100"
              }`}
            >
              <m.div
                className="h-full bg-teal-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
