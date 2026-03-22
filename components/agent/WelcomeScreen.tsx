"use client";

import { Search, Globe, FileSearch, ShoppingBag, Bot } from "lucide-react";

type SuggestionCard = {
  icon: React.ReactNode;
  title: string;
  example: string;
};

const SUGGESTIONS: SuggestionCard[] = [
  { icon: <Search className="w-5 h-5 text-blue-500" />, title: "Search the web", example: "Search Google for weather in Karachi" },
  { icon: <Globe className="w-5 h-5 text-emerald-500" />, title: "Navigate websites", example: "Navigate to GitHub and find trending repos" },
  { icon: <FileSearch className="w-5 h-5 text-amber-500" />, title: "Extract information", example: "Go to Hacker News and summarize top stories" },
  { icon: <ShoppingBag className="w-5 h-5 text-purple-500" />, title: "Research products", example: "Find the price of iPhone 15 on Amazon" },
];

interface WelcomeScreenProps {
  onSelectSuggestion: (task: string) => void;
}

export function WelcomeScreen({ onSelectSuggestion }: WelcomeScreenProps) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-24 h-24 rounded bg-gradient-to-br from-primary to-teal-500 mb-8 shadow-2xl shadow-primary/30">
        <Bot className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-semibold mb-2 text-foreground">
        Welcome to Browser Agent
      </h2>
      <p className="text-muted-foreground mb-10">
        AI-powered browser automation with Playwright
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
        {SUGGESTIONS.map((card, i) => (
          <button
            key={i}
            onClick={() => onSelectSuggestion(card.example)}
            className="group text-left px-4 py-2 bg-card border border-border rounded hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {card.icon}
              </span>
              <div>
                <p className="font-medium text-sm text-foreground">
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  "{card.example}"
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
