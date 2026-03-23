import { NextRequest } from "next/server";
import { Ollama } from "ollama";
import Groq from "groq-sdk";
import { ActionSchema, Action, ActionJsonSchema } from "./schema";
import {
  initBrowser,
  navigateTo,
  clickElement,
  typeIntoElement,
  takeScreenshot,
  readPageText,
  getAccessibilityTree,
  pressKey,
  closeBrowser,
} from "./browser";

const BASE_SYSTEM_PROMPT = `IMPORTANT SEARCH RULES:
- NEVER use google.com for searching — it blocks automated browsers
- ALWAYS use https://duckduckgo.com as your default search engine
- If duckduckgo fails for any reason, fall back to https://www.bing.com
- Both work exactly like Google but without bot protection

You are a browser automation agent.

SELECTOR FORMAT — THIS IS CRITICAL:
- ONLY use this exact format: role=button[name="exact name"]
- The name MUST be copied exactly from the accessibility tree output
- Examples:
    role=button[name="Google Search"]
    role=textbox[name="Search"]
    role=link[name="Wikipedia"]
    role=combobox[name="Search"]
- NEVER invent selectors
- NEVER use XPath, CSS, or any other format

WORKFLOW FOR EVERY TASK:
1. navigate → go to the URL
2. get_accessibility_tree → find real element names
3. type or click → use exact names from step 2
4. After typing into a search box, use press_key with key="Enter" instead of trying to click any search button
5. screenshot → confirm the results loaded
6. read_page → extract the actual text content from results
7. done → summarize with SPECIFIC data from read_page (numbers, facts, dates etc.)

RULES FOR "done" action:
- NEVER use done immediately after a screenshot
- You MUST call read_page first to extract actual content
- The "result" field MUST contain a detailed TEXTUAL summary of all your findings. Include specific data like prices, names, and status of forms.
- EXAMPLES of good "result" data:
  "Weather in Karachi: 32°C, Sunny, Humidity 65%. 3-day forecast: Mon 33°C, Tue 31°C."
  "Top 3 Trending JS Repos: 1. next.js (120k stars), 2. tailwindcss (80k stars), 3. lucide (20k stars)."
- NEVER just say "Task completed successfully" or "I found the info". BE SPECIFIC.
`;

// Get LLM response based on provider
async function getLLMResponse(
  provider: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  if (provider === "groq") {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model,
      messages: messages as any,
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    return response.choices[0]?.message?.content || "{}";
  }

  // Default: Ollama
  const ollama = new Ollama();
  const response = await ollama.chat({
    model,
    messages,
    format: ActionJsonSchema,
    options: { temperature: 0.1 },
  });
  return response.message.content;
}

export async function POST(req: NextRequest) {
  const { task, provider = "ollama", model = "gemma3:latest", memory = "" } =
    await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (type: string, message: string) => {
        const data = JSON.stringify({ type, message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        await initBrowser();

        // Build system prompt with optional memory
        let systemPrompt = BASE_SYSTEM_PROMPT;
        if (memory && memory.trim()) {
          systemPrompt =
            `USER MEMORY (facts learned from past tasks):\n${memory}\n\n` +
            systemPrompt;
        }
        if (provider === "groq") {
          systemPrompt += `\nYou MUST respond in valid JSON matching the action schema.`;
        }

        const messages: { role: string; content: string }[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Complete this task: ${task}` },
        ];

        push("start", `🚀 Starting task: ${task} (${provider}/${model})`);

        for (let step = 0; step < 20; step++) {
          push("thinking", "🤔 Thinking...");

          const rawAction = await getLLMResponse(provider, model, messages);
          const parsed = JSON.parse(rawAction);

          // ✅ Fallback if model skips reasoning field
          if (!parsed.reasoning) parsed.reasoning = "No reasoning provided";

          const action: Action = ActionSchema.parse(parsed);

          push("reasoning", `💭 ${action.reasoning}`);
          push(
            "action",
            `⚡ ${action.action.toUpperCase()}${action.url ? `: ${action.url}` : ""}${action.selector ? `: ${action.selector}` : ""}${action.key ? ` [key=${action.key}]` : ""}`
          );

          // Validation guards
          if (action.action === "navigate" && !action.url) {
            push("error", "❌ Model returned navigate without a URL, retrying...");
            messages.push({ role: "assistant", content: rawAction });
            messages.push({
              role: "user",
              content: "You must provide a url field when using navigate action. Try again.",
            });
            continue;
          }

          if (
            (action.action === "click" || action.action === "type") &&
            !action.selector
          ) {
            push("error", "❌ Model returned click/type without a selector, retrying...");
            messages.push({ role: "assistant", content: rawAction });
            messages.push({
              role: "user",
              content: "You must provide a selector field when using click or type. Try again.",
            });
            continue;
          }

          let actionResult = "";

          switch (action.action) {
            case "navigate":
              await navigateTo(action.url!);
              actionResult = `Navigated to ${action.url}`;

              const autoScreenshot = await takeScreenshot();
              push("screenshot", autoScreenshot);
              messages.push({ role: "assistant", content: rawAction });
              messages.push({
                role: "user",
                content: `Navigated to ${action.url}. Here is the current page screenshot as base64: [SCREENSHOT]${autoScreenshot.slice(0, 200)}... 
    Now look at the page and decide your next action. DO NOT navigate to the same URL again.`,
              });
              continue;

            case "click":
              try {
                await clickElement(action.selector!);
                actionResult = `Clicked ${action.selector}`;
              } catch (e: any) {
                actionResult = e.message;
                push("result", `⚠️ Click failed — model will self-correct`);
              }
              break;

            case "type":
              try {
                await typeIntoElement(action.selector!, action.text!);
                actionResult = `Typed "${action.text}" into ${action.selector}`;
              } catch (e: any) {
                actionResult = e.message;
                push("result", `⚠️ Type failed — model will self-correct`);
              }
              break;

            case "press_key":
              await pressKey(action.key!);
              actionResult = `Pressed key: ${action.key}`;
              break;

            case "screenshot":
              const base64 = await takeScreenshot();
              push("screenshot", base64);
              actionResult = `[SCREENSHOT]${base64}`;
              break;

            case "read_page":
              const text = await readPageText();
              actionResult = text;
              push("result", `📄 Page text captured (${text.length} chars)`);
              break;

            case "get_accessibility_tree":
              const tree = await getAccessibilityTree();
              actionResult = tree;
              push("result", `🌳 Accessibility tree captured (${tree.length} chars)`);
              break;

            case "done":
              // Final capture for visual confirmation
              try {
                const finalScreenshot = await takeScreenshot();
                push("screenshot", finalScreenshot);
              } catch {
                // Ignore if browser already disconnected
              }
              push("done", `✅ ${action.result}`);
              push("memory_update", action.result || "");
              await closeBrowser();
              controller.close();
              return;
          }

          if (action.action !== "screenshot" && action.action !== "read_page") {
            push("result", `✓ ${actionResult}`);
          }

          messages.push({ role: "assistant", content: rawAction });
          messages.push({
            role: "user",
            content: `Action completed. Result: ${actionResult.slice(0, 500)}. What's your next action?`,
          });
        }

        push("done", "✅ Max steps reached.");
        await closeBrowser();
        controller.close();
      } catch (err: any) {
        push("error", `❌ Error: ${err.message}`);
        await closeBrowser();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
