# 🤖 Browser Agent

A powerful, stealthy browser automation agent built with **Next.js**, **Playwright**, and Supporting multiple LLM providers (**Ollama** & **Groq**). This agent can navigate websites, interact with elements using ARIA selectors, and perform complex research tasks autonomously.

## 🚀 Key Features

- **Multi-Provider Support**: Switch seamlessly between local **Ollama** models (e.g., `gemma3`) and high-speed **Groq** API models (e.g., `llama-3.3-70b`).
- **Stealth Browser Engine**: Advanced anti-detection setup using custom user-agents, locale emulation, and modified browser fingerprints to bypass bot protection.
- **Smart ARIA Selection**: Optimized to use accessibility trees and ARIA roles (`role=button[name="..."]`) for highly reliable element interaction.
- **Agent Memory**: Persistently stores facts learned from past tasks in `localStorage`, giving the agent long-term context across sessions.
- **Task History**: Built-in sidebar to track and re-run past tasks with persistent storage.
- **Visual Filmstrip**: Real-time screenshot history displayed as a filmstrip, allowing you to walk through every step the agent took.
- **Result Export**: One-click export of task logs and final results to a `.txt` file.
- **Self-Correction**: Robust error handling that guides the model to fix failed clicks or typing actions in real-time.

## 🛠️ Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router), Tailwind CSS
- **Backend API**: Next.js Route Handlers (SSE for real-time streaming)
- **Browser Control**: Playwright (Chromium)
- **Schema Validation**: Zod & Zod-to-JSON-Schema
- **LLM SDKs**: `ollama`, `groq-sdk`

## 📦 Getting Started

### 1. Prerequisites
- [Ollama](https://ollama.com/) installed and running (if using local models).
- Node.js 18+ installed.

### 2. Installation
```bash
git clone <repository-url>
cd browser-agent
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start using the agent.

## 🧠 Navigation & Search Rules
- **Search Engine**: The agent is configured to use **DuckDuckGo** and **Bing** by default to avoid Google's aggressive bot protection.
- **Interaction**: Prefers `press_key` (Enter) after typing into search boxes for more human-like behavior.

## 📁 Project Structure
- `app/page.tsx`: Main UI hub, handles state, SSE, and `localStorage`.
- `app/api/agent/route.ts`: Core agent loop, prompt engineering, and LLM orchestration.
- `app/api/agent/browser.ts`: Playwright logic, stealth configuration, and locator resolution.
- `app/api/agent/schema.ts`: Zod schema definitions for agent actions.

## 🛡️ License
MIT
