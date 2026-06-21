import React, { useState } from "react";
import { Play, ChevronRight, ChevronDown, Layers, Terminal } from "lucide-react";
import { m, AnimatePresence } from "motion/react";

const getAgentColor = (route: string) => {
  const routeLower = route.toLowerCase();
  if (routeLower.includes("orchestrator")) return "text-purple-400 border-purple-500/20 bg-purple-500/5";
  if (routeLower.includes("doc") || routeLower.includes("readme")) return "text-teal-400 border-teal-500/20 bg-teal-500/5";
  if (routeLower.includes("knowledge") || routeLower.includes("rag")) return "text-blue-400 border-blue-500/20 bg-blue-500/5";
  if (routeLower.includes("cleaner") || routeLower.includes("ast")) return "text-amber-400 border-amber-500/20 bg-amber-500/5";
  return "text-slate-400 border-slate-800 bg-slate-900/50";
};

const getAgentBadgeText = (route: string) => {
  const routeLower = route.toLowerCase();
  if (routeLower.includes("orchestrator")) return "orchestrator agent";
  if (routeLower.includes("doc") || routeLower.includes("readme")) return "documentation helper";
  if (routeLower.includes("knowledge") || routeLower.includes("rag")) return "knowledge base";
  if (routeLower.includes("cleaner") || routeLower.includes("ast")) return "cleaner agent";
  return "unknown specialist";
};

interface OrchestratorViewProps {
  orchPayload: string;
  setOrchPayload: (val: string) => void;
  orchEventType: string;
  setOrchEventType: (val: string) => void;
  dispatchOrchEvent: () => void;
  orchResult: any;
  routingEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    payload: string;
    route: string;
    confidence: number;
    outcome: string;
    failed?: boolean;
  }>;
}

export default function OrchestratorView({
  orchPayload,
  setOrchPayload,
  orchEventType,
  setOrchEventType,
  dispatchOrchEvent,
  orchResult,
  routingEvents
}: OrchestratorViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);



  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb row */}
      <div className="text-[12px] font-mono text-slate-500 tracking-tight flex items-center gap-1">
        <span>codeLore</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-slate-400">orchestrator</span>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-purple-400">eventRouting</span>
      </div>

      {/* Intro section */}
      <div>
        <h3 className="text-[16px] font-sans font-medium text-white flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-purple-400" />
          <span>Orchestrated event router</span>
        </h3>
        <p className="text-[12px] text-slate-400 mt-1">
          Evaluate unknown event payloads using direct patterns or large language model intelligence to dispatch specialist agents dynamically.
        </p>
      </div>

      {/* Event simulator playground card */}
      <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 md:p-5 flex flex-col gap-4">
        <h4 className="text-[14px] font-sans font-medium text-slate-300">
          Sandbox event dispatcher
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="event-type-select" className="text-[12px] font-sans font-normal text-slate-400">Asserted event type</label>
            <select
              id="event-type-select"
              value={orchEventType}
              onChange={(e) => setOrchEventType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg text-[12px] font-sans font-normal p-2.5 text-slate-200 outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option value="unknown">Deterministic / Unknown (LLM decides)</option>
              <option value="push">Simulated push commit (Docs Fast Route)</option>
              <option value="chat_query">Natural language query (KB RAG Fast Route)</option>
              <option value="scan">Code AST scan (Cleaner Fast Route)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="payload-input" className="text-[12px] font-sans font-normal text-slate-400">Event payload contents</label>
            <input
              id="payload-input"
              type="text"
              placeholder="e.g., 'Please check main repository file and scan for unused statements' or generic queries."
              value={orchPayload}
              onChange={(e) => setOrchPayload(e.target.value)}
              aria-label="Event payload contents"
              className="bg-slate-900 border border-slate-800 rounded-lg text-[12px] font-sans font-normal p-2.5 text-slate-200 outline-none focus:border-purple-500 transition placeholder-slate-600"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={dispatchOrchEvent}
            className="bg-purple-500 hover:bg-purple-400 text-black px-4 py-2 rounded-lg font-sans text-[12px] font-medium cursor-pointer flex items-center gap-1.5 active:scale-95 transition"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Dispatch to orchestrator</span>
          </button>
        </div>
      </div>

      {/* Live Routing Timeline */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[14px] font-sans font-medium text-slate-300">
            Routing timeline
          </h4>
          <span className="text-[12px] font-mono text-slate-500">Autonomous loop active</span>
        </div>

        {routingEvents.length === 0 ? (
          <div className="border border-slate-850 border-dashed rounded-lg p-8 text-center text-[12px] font-sans font-normal text-slate-500">
            No events routed yet. CodeLore is listening.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {routingEvents.map((ev) => {
                const isExpanded = expandedId === ev.id;
                const cardColor = getAgentColor(ev.route);
                
                return (
                  <m.div
                    key={ev.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors select-none ${
                      ev.failed 
                        ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10" 
                        : isExpanded 
                          ? "border-slate-700 bg-slate-900/60" 
                          : "border-slate-850 bg-slate-950/20 hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500">{ev.timestamp}</span>
                        <span className="font-mono bg-slate-850 px-2 py-0.5 rounded text-slate-400 capitalize">
                          {ev.eventType}
                        </span>
                        
                        {!ev.failed ? (
                          <span className={`font-mono border px-2 py-0.5 rounded text-[10px] ${cardColor}`}>
                            {getAgentBadgeText(ev.route)}
                          </span>
                        ) : (
                          <span className="font-mono border border-red-500/20 bg-red-500/5 text-red-400 px-2 py-0.5 rounded text-[10px]">
                            Route failure
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.confidence > 0 && (
                          <span className="font-mono text-slate-500 text-[11px]">
                            Confidence {(ev.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-[12px] text-slate-300 font-sans font-normal truncate pl-1">
                      {ev.payload}
                    </div>

                    <div className="mt-1.5 text-[11px] text-slate-500 font-mono tracking-tight pl-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span>{ev.outcome}</span>
                      {ev.failed && (
                        <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          invalid schema specification
                        </span>
                      )}
                    </div>

                    {/* Expanded JSON details */}
                    {isExpanded && (
                      <div 
                        className="mt-3 pt-3 border-t border-slate-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
                          Standard output payload contract
                        </span>
                        <pre className="bg-slate-905 border border-slate-900 p-2.5 rounded text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
                          {JSON.stringify(
                            {
                              id: ev.id,
                              timestamp: ev.timestamp,
                              eventType: ev.eventType,
                              payload: ev.payload,
                              targetAgent: ev.route,
                              routeConfidence: ev.confidence,
                              resolvedOutcome: ev.outcome,
                              systemLog: ev.failed ? "payload format failed basic structural parser check" : "completed specialist synchronization"
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
