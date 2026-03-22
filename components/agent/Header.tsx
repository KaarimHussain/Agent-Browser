"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { History, Bot, Brain, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Provider } from "./types";
import { cn } from "@/lib/utils";

interface HeaderProps {
  provider: Provider;
  setProvider: (p: Provider) => void;
  ollamaModel: string;
  setOllamaModel: (m: string) => void;
  groqModel: string;
  setGroqModel: (m: string) => void;
  memoryCount: number;
  onOpenHistory: () => void;
  onOpenMemory: () => void;
}

export function Header({
  provider,
  setProvider,
  ollamaModel,
  setOllamaModel,
  groqModel,
  setGroqModel,
  memoryCount,
  onOpenHistory,
  onOpenMemory
}: HeaderProps) {
  return (
    <header className="shrink-0 border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10 transition-all">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenHistory}
            className="shrink-0 rounded hover:bg-secondary transition-all"
          >
            <History className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent tracking-tight">
              Browser Agent
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider Toggle */}
          <div className="flex bg-secondary rounded-xl p-1">
            <Button
              variant={provider === "ollama" ? "default" : "ghost"}
              size="sm"
              onClick={() => setProvider("ollama")}
              className={`h-8 text-xs rounded-lg transition-all ${provider === "ollama"
                ? "bg-primary hover:bg-primary/90 shadow-sm"
                : ""
                }`}
            >
              Ollama
            </Button>
            <Button
              variant={provider === "groq" ? "default" : "ghost"}
              size="sm"
              onClick={() => setProvider("groq")}
              className={`h-8 text-xs rounded-lg transition-all gap-1.5 ${provider === "groq"
                ? "bg-primary hover:bg-primary/90 shadow-sm"
                : ""
                }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Groq
            </Button>
          </div>

          {/* Model Selector */}
          {provider === "ollama" ? (
            <Input
              className="h-8 w-36 text-xs rounded bg-secondary border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="Model name"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
            />
          ) : (
            <select
              className="h-8 px-3 text-xs bg-secondary border-0 rounded focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b</option>
              <option value="llama3-70b-8192">llama3-70b</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b</option>
            </select>
          )}

          <Separator orientation="vertical" className="h-6 mx-2" />

          <Tooltip>
            <TooltipTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-sm rounded-xl hover:bg-secondary transition-all font-semibold gap-2"
              )}
              onClick={onOpenMemory}
            >
              <Brain className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Memory</span>
              {memoryCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                  {memoryCount}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent>Agent Memory</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
