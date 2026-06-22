import React from "react";

const RippleLoader = () => {
  const [statusIdx, setStatusIdx] = React.useState(0);
  const [legToggle, setLegToggle] = React.useState(false);
  const statuses = ["scanning memory arrays...", "ranking chunks...", "compiling answer..."];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 850);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const legInterval = setInterval(() => {
      setLegToggle((prev) => !prev);
    }, 180);
    return () => clearInterval(legInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none w-full my-6">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Walking Pixel Dino SVG */}
        <svg viewBox="0 0 24 24" className="w-16 h-16 text-teal-400 fill-current animate-[bounce_0.8s_infinite]" style={{ imageRendering: 'pixelated' }}>
          {/* Dino body */}
          <path d="M12 2h8v2h-8V2z M10 4h10v2H10V4z M10 6h12v2H10V6z M10 8h8v2h-8V8z M6 10h12v2H6v-2z M4 12h14v2H4v-2z M2 14h14v2H2v-2z M2 16h12v2H2v-2z" />
          {/* Animated legs */}
          {legToggle ? (
            <>
              <path d="M4 18h2v3H4v-3z M8 18h2v2H8v-2z" />
            </>
          ) : (
            <>
              <path d="M4 18h2v2H4v-2z M8 18h2v3H8v-3z" />
            </>
          )}
          {/* Eye */}
          <rect x="14" y="4" width="2" height="2" className="text-slate-950 fill-current" />
        </svg>
        {/* Ground line */}
        <div className="absolute bottom-2 left-0 right-0 h-0.5 bg-slate-800" />
      </div>
      <span className="mt-4 font-mono text-[11px] text-[#1D9E75] animate-pulse">
        {statuses[statusIdx]}
      </span>
    </div>
  );
};

export default RippleLoader;
