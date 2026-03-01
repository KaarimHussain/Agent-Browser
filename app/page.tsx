"use client";

import { useState, useRef, useEffect } from "react";

type Log = {
  type: string;
  message: string;
  time: string;
};

type HistoryItem = {
  id: number;
  task: string;
  result: string;
  timestamp: string;
  stepCount: number;
};

// localStorage helpers (all wrapped in try/catch)
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

function loadStringFromStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStringToStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage full or unavailable */
  }
}

export default function Home() {
  const [task, setTask] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Provider/model state
  const [provider, setProvider] = useState("ollama");
  const [ollamaModel, setOllamaModel] = useState("gemma3:latest");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");

  // Task history
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Agent memory
  const [memory, setMemory] = useState("");
  const [showMemory, setShowMemory] = useState(false);
  const memoryFacts = memory
    .split("\n")
    .filter((l) => l.trim().length > 0);

  // Load from localStorage on mount
  useEffect(() => {
    setHistory(loadFromStorage<HistoryItem[]>("agent_history", []));
    setMemory(loadStringFromStorage("agent_memory", ""));
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const currentModel = provider === "groq" ? groqModel : ollamaModel;

  const runTask = async () => {
    if (!task.trim() || isRunning) return;

    setLogs([]);
    setScreenshot(null);
    setScreenshots([]);
    setIsRunning(true);
    setIsDone(false);

    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, provider, model: currentModel, memory }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;

        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === "screenshot") {
            setScreenshot(data.message);
            setScreenshots((prev) => [...prev, data.message]);
          } else if (data.type === "memory_update") {
            // Append to memory (max 500 chars)
            setMemory((prev) => {
              const newFact = data.message;
              let updated = prev ? prev + "\n" + newFact : newFact;
              if (updated.length > 500) {
                // Trim oldest lines until under 500
                const lines = updated.split("\n");
                while (updated.length > 500 && lines.length > 1) {
                  lines.shift();
                  updated = lines.join("\n");
                }
              }
              saveStringToStorage("agent_memory", updated);
              return updated;
            });
          } else {
            setLogs((prev) => [
              ...prev,
              {
                type: data.type,
                message: data.message,
                time: new Date().toLocaleTimeString(),
              },
            ]);
          }

          if (data.type === "done") {
            setIsRunning(false);
            setIsDone(true);
            // Save to history
            setLogs((currentLogs) => {
              const item: HistoryItem = {
                id: Date.now(),
                task,
                result: data.message,
                timestamp: new Date().toLocaleString(),
                stepCount: currentLogs.length + 1,
              };
              const updated = [item, ...loadFromStorage<HistoryItem[]>("agent_history", [])];
              saveToStorage("agent_history", updated);
              setHistory(updated);
              return [...currentLogs, { type: data.type, message: data.message, time: new Date().toLocaleTimeString() }];
            });
            // Skip the normal setLogs below since we handled it inside
            continue;
          }

          if (data.type === "error") {
            setIsRunning(false);
          }
        } catch (e) {
          console.error("Failed to parse SSE chunk:", e);
        }
      }
    }

    setIsRunning(false);
  };

  const exportResult = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const lines = [
      `Task: ${task}`,
      `Timestamp: ${new Date().toLocaleString()}`,
      `Provider: ${provider} / ${currentModel}`,
      "",
      "=== LOG ===",
      ...logs.map((l) => `[${l.time}] [${l.type}] ${l.message}`),
      "",
      "=== RESULT ===",
      logs.find((l) => l.type === "done")?.message ?? "(no result)",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-result-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    setHistory([]);
    saveToStorage("agent_history", []);
  };

  const clearMemory = () => {
    setMemory("");
    saveStringToStorage("agent_memory", "");
  };

  const logColor: Record<string, string> = {
    start: "text-purple-400",
    thinking: "text-yellow-400",
    reasoning: "text-gray-400 italic",
    action: "text-blue-400 font-semibold",
    result: "text-gray-300",
    done: "text-green-400 font-semibold",
    error: "text-red-400",
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <div className="flex gap-4 max-w-[1600px] mx-auto">
        {/* ─── SIDEBAR: Past Tasks ─── */}
        <div
          className={`shrink-0 transition-all duration-300 ${showHistory ? "w-72" : "w-10"
            }`}
        >
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-10 h-10 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition text-lg"
            title={showHistory ? "Collapse history" : "Show past tasks"}
          >
            {showHistory ? "◀" : "📋"}
          </button>

          {showHistory && (
            <div className="mt-2 bg-gray-900 border border-gray-800 rounded-xl p-3 h-[calc(100vh-120px)] overflow-y-auto">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">
                Past Tasks
              </p>
              {history.length === 0 && (
                <p className="text-gray-600 text-xs text-center mt-8">
                  No history yet
                </p>
              )}
              {history.map((h, index) => (
                <button
                  key={index}
                  onClick={() => setTask(h.task)}
                  className="w-full text-left mb-2 p-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition group"
                >
                  <p className="text-sm text-gray-200 truncate group-hover:text-white">
                    {h.task}
                  </p>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{h.timestamp}</span>
                    <span>{h.stepCount} steps</span>
                  </div>
                </button>
              ))}
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="w-full mt-2 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition"
                >
                  Clear History
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-1">🤖 Browser Agent</h1>
            <p className="text-gray-500 text-sm">
              Ollama + Groq · Playwright + Next.js
            </p>
          </div>

          {/* Provider / Model Selector */}
          <div className="flex gap-3 mb-4 items-center">
            <div className="flex bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setProvider("ollama")}
                className={`px-4 py-2 text-sm font-medium transition ${provider === "ollama"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
                  }`}
              >
                🦙 Ollama (Local)
              </button>
              <button
                onClick={() => setProvider("groq")}
                className={`px-4 py-2 text-sm font-medium transition ${provider === "groq"
                  ? "bg-green-600 text-white"
                  : "text-gray-400 hover:text-white"
                  }`}
              >
                ⚡ Groq (Fast)
              </button>
            </div>

            {provider === "ollama" ? (
              <input
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm w-48
                           placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                placeholder="Model name"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
              />
            ) : (
              <select
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm
                           focus:outline-none focus:border-green-500 transition"
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="llama3-70b-8192">llama3-70b-8192</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
              </select>
            )}

            {/* Memory indicator */}
            <button
              onClick={() => setShowMemory(true)}
              className="ml-auto px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm hover:bg-gray-700 transition"
              title="View agent memory"
            >
              🧠 Memory{memoryFacts.length > 0 && ` (${memoryFacts.length})`}
            </button>
          </div>

          {/* Task Input */}
          <div className="flex gap-3 mb-6">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              placeholder='Try: "Search Google for weather in Karachi"'
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runTask()}
              disabled={isRunning}
            />
            <button
              onClick={runTask}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700
                         disabled:cursor-not-allowed rounded-xl font-medium transition-colors min-w-[120px]"
            >
              {isRunning ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running
                </span>
              ) : (
                "Run Task"
              )}
            </button>
            {isDone && !isRunning && (
              <button
                onClick={exportResult}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition-colors text-sm"
              >
                📥 Export
              </button>
            )}
          </div>

          {/* Split View */}
          <div className="grid grid-cols-2 gap-4">
            {/* Agent Log */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-[520px] overflow-y-auto">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-semibold">
                Agent Log
              </p>
              {logs.length === 0 && (
                <p className="text-gray-600 text-sm text-center mt-24">
                  Waiting for task...
                </p>
              )}
              {logs.map((log, i) => (
                <div key={i} className="mb-1.5 text-sm font-mono flex gap-2">
                  <span className="text-gray-600 shrink-0">{log.time}</span>
                  <span className={logColor[log.type] ?? "text-gray-400"}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Live Screenshot + Filmstrip */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-[520px] flex flex-col">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-semibold">
                Live Browser View
              </p>
              {screenshot ? (
                <img
                  src={`data:image/png;base64,${screenshot}`}
                  alt="Browser"
                  className="rounded-lg w-full flex-1 object-contain object-top min-h-0"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    Screenshot appears here when agent looks at the page
                  </p>
                </div>
              )}

              {/* Filmstrip */}
              {screenshots.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {screenshots.map((ss, i) => (
                    <button
                      key={i}
                      onClick={() => setScreenshot(ss)}
                      className={`shrink-0 relative rounded border-2 transition ${screenshot === ss
                        ? "border-blue-500"
                        : "border-gray-700 hover:border-gray-500"
                        }`}
                    >
                      <img
                        src={`data:image/png;base64,${ss}`}
                        alt={`Step ${i + 1}`}
                        className="w-20 h-[50px] object-cover rounded"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/70 text-[10px] px-1 rounded-tl text-gray-300">
                        {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MEMORY MODAL ─── */}
      {showMemory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">🧠 Agent Memory</h2>
              <button
                onClick={() => setShowMemory(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            {memoryFacts.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No memories stored yet. The agent learns facts after completing
                tasks.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {memoryFacts.map((fact, i) => (
                  <div
                    key={i}
                    className="bg-gray-800 rounded-lg p-2 text-sm text-gray-300"
                  >
                    {fact}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-4">
              <span className="text-xs text-gray-500">
                {memory.length}/500 chars
              </span>
              <button
                onClick={clearMemory}
                className="px-3 py-1 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition"
              >
                Clear Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
