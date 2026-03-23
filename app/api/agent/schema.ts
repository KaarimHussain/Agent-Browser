import { z } from "zod";

export const ActionSchema = z.object({
  action: z.enum(["navigate", "click", "type", "screenshot", "read_page", "get_accessibility_tree", "press_key", "done"]),
  url: z.string().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  result: z.any().optional().transform((val) => 
    val === undefined ? undefined : (typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val))
  ),
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
    result: { description: "Final textual summary or structured findings" },
    key: { type: "string" },
    reasoning: { type: "string" },
  },
  required: ["action", "reasoning"],
};