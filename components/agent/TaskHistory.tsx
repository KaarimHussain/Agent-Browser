"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ClipboardList } from "lucide-react";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HistoryItem } from "./types";

interface TaskHistoryProps {
  history: HistoryItem[];
  setTask: (t: string) => void;
  closeHistory: () => void;
  clearHistory: () => void;
}

export function TaskHistory({
  history,
  setTask,
  closeHistory,
  clearHistory
}: TaskHistoryProps) {
  return (
    <SheetContent side="left" className="w-80 bg-card border-r shadow-xl">
      <SheetHeader className="border-b pb-4">
        <SheetTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Task History
        </SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-140px)] mt-4 px-5">
        {history.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">No history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={() => {
                  setTask(h.task);
                  closeHistory();
                }}
                className="w-full justify-start text-left h-auto py-3 px-4 rounded hover:bg-secondary transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{h.task}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {h.timestamp}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        )}
        {history.length > 0 && (
          <Button
            variant="outline"
            onClick={clearHistory}
            className="w-full mt-4 rounded text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            Clear History
          </Button>
        )}
      </ScrollArea>
    </SheetContent>
  );
}
