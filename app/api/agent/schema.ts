import { z } from "zod";

export const ActionSchema = z.object({
  action: z.enum(["navigate", "click", "type", "screenshot", "read_page", "get_accessibility_tree", "press_key", "done"]),
  url: z.string().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  result: z.string().optional(),
  key: z.string().optional(),
  reasoning: z.string().optional(),
});

export type Action = z.infer<typeof ActionSchema>;

// ✅ Raw JSON schema — what Ollama actually expects
export const ActionJsonSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["navigate", "click", "type", "screenshot", "read_page", "get_accessibility_tree", "press_key", "done"],
    },
    url: { type: "string" },
    selector: { type: "string" },
    text: { type: "string" },
    result: { type: "string" },
    key: { type: "string" },
    reasoning: { type: "string" },
  },
  required: ["action", "reasoning"],
};