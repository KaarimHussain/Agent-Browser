export type Log = {
  type: string;
  message: string;
  time: string;
};

export type HistoryItem = {
  id: number;
  task: string;
  result: string;
  timestamp: string;
  stepCount: number;
};

export type Provider = "ollama" | "groq";
