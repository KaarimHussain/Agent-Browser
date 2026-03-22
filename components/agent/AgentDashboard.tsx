"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Eye, 
  Download, 
  PlayCircle,
  Loader2,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Target,
  Camera,
  Layers,
  ClipboardList
} from "lucide-react";
import { Log } from "./types";

interface AgentDashboardProps {
  logs: Log[];
  isRunning: boolean;
  isDone: boolean;
  screenshot: string | null;
  screenshots: string[];
  setScreenshot: (ss: string) => void;
  exportResult: () => void;
}

const getLogIcon = (type: string) => {
  switch (type) {
    case "start": return <PlayCircle className="w-4 h-4" />;
    case "thinking": return <Loader2 className="w-4 h-4 animate-spin" />;
    case "reasoning": return <Sparkles className="w-4 h-4" />;
    case "action": return <Zap className="w-4 h-4" />;
    case "result": return <FileText className="w-4 h-4" />;
    case "done": return <CheckCircle2 className="w-4 h-4" />;
    case "error": return <AlertCircle className="w-4 h-4" />;
    default: return <Target className="w-4 h-4" />;
  }
};

const getLogColor = (type: string) => {
  switch (type) {
    case "start": return "text-emerald-600 dark:text-emerald-400";
    case "thinking": return "text-amber-600 dark:text-amber-400";
    case "reasoning": return "text-muted-foreground italic";
    case "action": return "text-blue-600 dark:text-blue-400";
    case "result": return "text-foreground";
    case "done": return "text-emerald-600 dark:text-emerald-400 font-semibold";
    case "error": return "text-destructive";
    default: return "text-muted-foreground";
  }
};

export function AgentDashboard({
  logs,
  isRunning,
  isDone,
  screenshot,
  screenshots,
  setScreenshot,
  exportResult
}: AgentDashboardProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-card border border-border rounded-[2rem] rounded-tl-sm p-2 w-full shadow-2xl shadow-primary/5 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-2 h-[calc(100vh-320px)] min-h-[450px] max-h-[650px]">
        
        {/* Logs Section */}
        <div className="flex-1 flex flex-col bg-secondary/20 rounded-[1.5rem] border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-secondary/30">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logs</span>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                  <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-xs">Waiting for agent actions...</p>
                </div>
              ) : (
                <>
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/30 hover:border-primary/30 transition-all group"
                    >
                      <span className="shrink-0 text-base mt-0.5 group-hover:scale-110 transition-transform">
                        {getLogIcon(log.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm break-words whitespace-pre-wrap leading-relaxed ${getLogColor(log.type)}`}>
                          {log.message}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60 mt-1 block font-mono">
                          {log.time}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isRunning && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 animate-pulse">
                      <span className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-xs font-medium text-primary">Agent is processing...</span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Preview Section */}
        <div className="flex-1 flex flex-col bg-secondary/20 rounded-[1.5rem] border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview</span>
            </div>
            {screenshots.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold shadow-sm">
                  {screenshots.length}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center">
            {screenshot ? (
              <div className="w-full h-full relative group rounded-xl overflow-hidden shadow-inner bg-black/5 border border-border/50">
                <img
                  src={`data:image/png;base64,${screenshot}`}
                  alt="Browser Stream"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="rounded-full shadow-lg"
                    onClick={() => window.open(`data:image/png;base64,${screenshot}`, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" /> View Full
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-40">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">No visual output yet</p>
                <p className="text-xs mt-1">Screenshots will appear here during tasks</p>
              </div>
            )}
          </div>
        </div>

        {/* History Sidebar (Inside Card) */}
        {screenshots.length > 0 && (
          <div className="w-full md:w-32 flex flex-col bg-card/40 border-l border-border/50 p-3 gap-3">
            <div className="flex items-center justify-center gap-1 mt-1">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">History</span>
            </div>
            <ScrollArea className="flex-1 h-20 md:h-full">
              <div className="flex md:flex-col gap-3 pb-2">
                {screenshots.map((ss, i) => (
                  <button
                    key={i}
                    onClick={() => setScreenshot(ss)}
                    className={`shrink-0 relative rounded-xl border-2 transition-all duration-300 overflow-hidden group hover:scale-105 ${screenshot === ss
                        ? "border-primary shadow-xl shadow-primary/20 ring-4 ring-primary/10"
                        : "border-border/50 hover:border-primary/40 shadow-sm"
                      }`}
                  >
                    <img
                      src={`data:image/png;base64,${ss}`}
                      alt={`Step ${i + 1}`}
                      className="w-full h-16 md:h-20 object-cover"
                    />
                    <div className={`absolute bottom-1 right-1 text-[10px] w-5 h-5 rounded-lg flex items-center justify-center shadow-lg font-bold border ${screenshot === ss
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/80 text-foreground border-border group-hover:bg-primary group-hover:text-primary-foreground"
                      }`}>
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Final Result Card */}
      {isDone && (
        <div className="mx-4 mt-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Final Output</span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {logs.find(l => l.type === 'done')?.message || "Task completed successfully."}
          </p>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 mt-2 gap-4 border-t border-border/50 bg-secondary/10">

        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {screenshots.slice(-4).map((ss, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-card overflow-hidden bg-secondary shadow-sm hover:z-10 transition-transform">
                <img src={`data:image/png;base64,${ss}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {screenshots.length} visual steps captured
          </p>
        </div>
        
        {isDone && !isRunning && (
          <div className="flex-1 flex justify-center">
            <Button
              variant="default"
              size="lg"
              onClick={exportResult}
              className="rounded-2xl px-10 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 group transition-all font-bold h-12"
            >
              <Download className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              Export Final Result
            </Button>
          </div>
        )}

        <div className="hidden md:block w-32" /> {/* Spacer for centering */}
      </div>
    </div>
  );
}
