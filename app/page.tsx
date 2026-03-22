"use client";

import { useState, useRef, useEffect } from "react";
import { Sheet } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// Components
import { Header } from "@/components/agent/Header";
import { TaskHistory } from "@/components/agent/TaskHistory";
import { AgentMemory } from "@/components/agent/AgentMemory";
import { WelcomeScreen } from "@/components/agent/WelcomeScreen";
import { AgentDashboard } from "@/components/agent/AgentDashboard";
import { InputArea } from "@/components/agent/InputArea";

// Types
import { Log, HistoryItem, Provider } from "@/components/agent/types";

// Utils
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
  } catch { }
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
  } catch { }
}

export default function Home() {
  const [task, setTask] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const [provider, setProvider] = useState<Provider>("ollama");
  const [ollamaModel, setOllamaModel] = useState("gemma3:latest");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [memory, setMemory] = useState("");
  const [memoryOpen, setMemoryOpen] = useState(false);
  const memoryFacts = memory.split("\n").filter((l) => l.trim().length > 0);

  useEffect(() => {
    setHistory(loadFromStorage<HistoryItem[]>("agent_history", []));
    setMemory(loadStringFromStorage("agent_memory", ""));
  }, []);

  const currentModel = provider === "groq" ? groqModel : ollamaModel;

  const runTask = async () => {
    if (!task.trim() || isRunning) return;

    const userTask = task;
    setTask("");
    setLogs([]);
    setScreenshot(null);
    setScreenshots([]);
    setIsRunning(true);
    setIsDone(false);

    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: userTask, provider, model: currentModel, memory }),
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
            setMemory((prev) => {
              const newFact = data.message;
              let updated = prev ? prev + "\n" + newFact : newFact;
              if (updated.length > 500) {
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
            setLogs((currentLogs) => {
              const item: HistoryItem = {
                id: Date.now(),
                task: userTask,
                result: data.message,
                timestamp: new Date().toLocaleString(),
                stepCount: currentLogs.length + 1,
              };
              const updated = [item, ...loadFromStorage<HistoryItem[]>("agent_history", [])];
              saveToStorage("agent_history", updated);
              setHistory(updated);
              return [...currentLogs, { type: data.type, message: data.message, time: new Date().toLocaleTimeString() }];
            });
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isRunning || isDone) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isRunning, isDone]);

  const exportResult = () => {
    const timestamp = new Date().toLocaleString();
    const finalResult = logs.find((l) => l.type === "done")?.message ?? "No structured result captured.";
    const reportTitle = `Browser Agent Execution Report`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
    <style>
        :root {
            --background: #1a1918;
            --foreground: #ecebe6;
            --card: #232220;
            --card-foreground: #ecebe6;
            --primary: #3ecf8e;
            --primary-soft: rgba(62, 207, 142, 0.15);
            --secondary: #2a2927;
            --secondary-foreground: #c9c8c4;
            --muted: #2a2927;
            --muted-foreground: #8a8986;
            --border: #32312e;
            --radius: 1rem;
            --font-heading: "DM Sans", system-ui, sans-serif;
            --font-body: "Inter", system-ui, sans-serif;
        }

        * { box-sizing: border-box; }

        body {
            font-family: var(--font-body);
            background-color: var(--background);
            color: var(--foreground);
            line-height: 1.6;
            margin: 0;
            padding: 60px 20px;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .header {
            text-align: left;
            margin-bottom: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
        }

        .header-left h1 {
            font-family: var(--font-heading);
            font-size: 2.25rem;
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, var(--primary) 0%, #2dd4bf 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .badge {
            background: var(--primary-soft);
            color: var(--primary);
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            display: inline-block;
            margin-bottom: 12px;
        }

        .section {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 40px;
            margin-bottom: 40px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }

        .section-title {
            font-family: var(--font-heading);
            font-size: 1rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--primary);
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
        }

        .summary-item label {
            display: block;
            color: var(--muted-foreground);
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }

        .summary-item p {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .result-box {
            background: var(--primary-soft);
            border: 1px solid var(--primary);
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
        }

        .result-text {
            font-size: 1.25rem;
            font-weight: 500;
            color: var(--foreground);
            white-space: pre-wrap;
            margin: 0;
        }

        .log-entry {
            display: grid;
            grid-template-columns: 100px 100px 1fr;
            gap: 20px;
            padding: 16px;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
        }

        .log-time { color: var(--muted-foreground); font-family: monospace; }
        .log-type { font-weight: 800; text-transform: uppercase; font-size: 0.7rem; }

        .timeline {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .screenshot-wrap {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border);
            background: var(--background);
        }

        .screenshot-wrap img { width: 100%; display: block; }
        .screenshot-info { padding: 12px; text-align: center; font-size: 0.8rem; color: var(--muted-foreground); }

        .final-img {
            width: 100%;
            border-radius: 12px;
            margin-top: 25px;
            border: 1px solid var(--border);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <span class="badge">Session Audit</span>
                <h1>Browser Agent Report</h1>
                <p style="color: var(--muted-foreground); margin:0;">Target: ${task}</p>
            </div>
            <div style="text-align: right; color: var(--muted-foreground); font-size: 0.8rem;">
                Generated: ${timestamp}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Final Conclusion</div>
            <div class="result-box">
                <p class="result-text">${finalResult}</p>
            </div>
            ${screenshot ? `<img src="data:image/png;base64,${screenshot}" class="final-img" />` : ""}
        </div>

        <div class="section">
            <div class="section-title">Execution Overview</div>
            <div class="summary-grid">
                <div class="summary-item">
                    <label>Configuration</label>
                    <p style="text-transform: capitalize;">${provider} / ${currentModel.split('/')[0]}</p>
                </div>
                <div class="summary-item">
                    <label>Activity</label>
                    <p>${logs.length} Operations</p>
                </div>
                <div class="summary-item">
                    <label>Visual Evidence</label>
                    <p>${screenshots.length} Captures</p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Visual Timeline</div>
            <div class="timeline">
                ${screenshots.map((ss, i) => `
                    <div class="screenshot-wrap">
                        <img src="data:image/png;base64,${ss}" />
                        <div class="screenshot-info">Step ${i + 1} Visual</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Chronological Audit</div>
            <div>
                ${logs.map(log => `
                    <div class="log-entry">
                        <div class="log-time">${log.time}</div>
                        <div class="log-type" style="color: ${log.type === 'error' ? '#ff6b6b' : log.type === 'action' ? '#3ecf8e' : 'inherit'}">${log.type}</div>
                        <div class="log-message">${log.message}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <p style="text-align: center; color: var(--muted-foreground); font-size: 0.8rem; margin-top: 60px; font-family: monospace;">
            AUDIT_ID: ${Math.random().toString(36).substring(7).toUpperCase()} | END_OF_REPORT
        </p>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-report-${new Date().toISOString().slice(0, 10)}.html`;
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    runTask();
  };

  return (
    <div className="flex h-screen bg-background text-foreground selection:bg-primary/20 overflow-hidden">
      {/* History Sidebar */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <TaskHistory
          history={history}
          setTask={setTask}
          closeHistory={() => setHistoryOpen(false)}
          clearHistory={clearHistory}
        />
      </Sheet>

      {/* Memory Sheet */}
      <Sheet open={memoryOpen} onOpenChange={setMemoryOpen}>
        <AgentMemory
          memoryFacts={memoryFacts}
          memoryLength={memory.length}
          clearMemory={clearMemory}
        />
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <Header
          provider={provider}
          setProvider={setProvider}
          ollamaModel={ollamaModel}
          setOllamaModel={setOllamaModel}
          groqModel={groqModel}
          setGroqModel={setGroqModel}
          memoryCount={memoryFacts.length}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenMemory={() => setMemoryOpen(true)}
        />

        {/* Chat Area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="max-w-6xl mx-auto px-4 py-8">
            {logs.length === 0 && !isRunning ? (
              <WelcomeScreen onSelectSuggestion={(t) => setTask(t)} />
            ) : (
              <div className="space-y-6">
                {/* User Message */}
                <div className="chat-message flex justify-end mb-2">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-6 py-3 max-w-[80%] shadow-lg shadow-primary/10 border border-primary/20">
                    <p className="text-sm font-medium leading-relaxed">{task || "Previous task"}</p>
                  </div>
                </div>

                {/* Agent Response Dashboard */}
                <div className="chat-message flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AgentDashboard
                    logs={logs}
                    isRunning={isRunning}
                    isDone={isDone}
                    screenshot={screenshot}
                    screenshots={screenshots}
                    setScreenshot={setScreenshot}
                    exportResult={exportResult}
                  />
                </div>
                
                {/* Anchor for auto-scroll */}
                <div ref={chatEndRef} className="h-4" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <InputArea
          task={task}
          setTask={setTask}
          isRunning={isRunning}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
