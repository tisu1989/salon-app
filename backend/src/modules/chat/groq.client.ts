import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";
import type { ToolDefinition } from "./tools.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Confirmed against the real Groq account's "Function Calling / Tool Use" models -
// llama-3.3-70b-versatile (an older docs example) is no longer available.
const MODEL = "openai/gpt-oss-120b";

export interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
}

export interface GroqReply {
  content: string | null;
  toolCalls: GroqToolCall[];
}

/** Thin wrapper around Groq's OpenAI-compatible chat completions API. */
export class GroqClient {
  async chat(messages: GroqMessage[], tools: ToolDefinition[]): Promise<GroqReply> {
    if (!env.GROQ_API_KEY) {
      throw new AppError(
        "CHAT_NOT_CONFIGURED",
        "The chat assistant isn't set up yet - ask an admin to add a GROQ_API_KEY.",
        503,
      );
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: tools.map((t) => ({ type: "function", function: t })),
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq chat completion failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string | null; tool_calls?: GroqToolCall[] } }[];
    };
    const message = data.choices[0]?.message;
    return { content: message?.content ?? null, toolCalls: message?.tool_calls ?? [] };
  }
}
