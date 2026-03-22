"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";

interface InputAreaProps {
  task: string;
  setTask: (t: string) => void;
  isRunning: boolean;
  onSubmit: (e?: React.FormEvent) => void;
}

export function InputArea({
  task,
  setTask,
  isRunning,
  onSubmit
}: InputAreaProps) {
  return (
    <div className="shrink-0 border-t bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <form onSubmit={onSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              className="h-10 text-base rounded border-border bg-secondary/50 focus:bg-card focus:border-primary/50 focus:ring-4 focus:ring-primary/15 transition-all shadow-sm"
              placeholder="Describe what you want the agent to do..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              disabled={isRunning}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isRunning || !task.trim()}
            className="h-10 px-8 rounded font-medium transition-all shadow-md hover:shadow-lg disabled:shadow-none bg-primary hover:bg-primary/90"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="font-bold">Send</span>
                <Send className="w-4 h-4 ml-1" />
              </span>
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Browser Agent can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
