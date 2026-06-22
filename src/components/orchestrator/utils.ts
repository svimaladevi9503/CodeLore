export const getAgentColor = (route: string) => {
  const routeLower = route.toLowerCase();
  if (routeLower.includes("orchestrator")) return "text-purple-400 border-purple-500/20 bg-purple-500/5";
  if (routeLower.includes("doc") || routeLower.includes("readme")) return "text-teal-400 border-teal-500/20 bg-teal-500/5";
  if (routeLower.includes("knowledge") || routeLower.includes("rag")) return "text-blue-400 border-blue-500/20 bg-blue-500/5";
  if (routeLower.includes("cleaner") || routeLower.includes("ast")) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
  return "text-slate-400 border-slate-800 bg-slate-900/50";
};

export const getAgentBadgeText = (route: string) => {
  const routeLower = route.toLowerCase();
  if (routeLower.includes("orchestrator")) return "orchestrator agent";
  if (routeLower.includes("doc") || routeLower.includes("readme")) return "documentation helper";
  if (routeLower.includes("knowledge") || routeLower.includes("rag")) return "knowledge base";
  if (routeLower.includes("cleaner") || routeLower.includes("ast")) return "cleaner agent";
  return "unknown specialist";
};
