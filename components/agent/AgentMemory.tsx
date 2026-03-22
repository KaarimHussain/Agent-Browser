"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Sparkles } from "lucide-react";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";

interface AgentMemoryProps {
  memoryFacts: string[];
  memoryLength: number;
  clearMemory: () => void;
}

export function AgentMemory({
  memoryFacts,
  memoryLength,
  clearMemory
}: AgentMemoryProps) {
  return (
    <SheetContent side="right" className="w-80 bg-card border-l shadow-xl">
      <SheetHeader className="border-b pb-4">
        <SheetTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Agent Memory
        </SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-140px)] mt-4 px-5">
        {memoryFacts.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">No memories stored yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              The agent learns facts after completing tasks
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {memoryFacts.map((fact, i) => (
              <Card
                key={i}
                className="bg-secondary border-0 p-3 rounded shadow-sm"
              >
                <p className="text-sm text-secondary-foreground">{fact}</p>
              </Card>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            {memoryLength}/500 chars
          </span>
          <Button
            variant="outline"
            onClick={clearMemory}
            className="text-destructive hover:text-destructive text-xs rounded border-destructive/30"
          >
            Clear Memory
          </Button>
        </div>
      </ScrollArea>
    </SheetContent>
  );
}
