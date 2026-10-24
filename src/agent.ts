import { query, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const DEFAULT_PROMPT = "What files are here?";
export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
export const WORKSPACE = fileURLToPath(new URL("../sample-workspace/", import.meta.url));
export async function sampleFiles(): Promise<string[]> {
  const entries = await readdir(WORKSPACE, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) =>
    (entry.parentPath.slice(WORKSPACE.length).replaceAll("\\", "/") + "/" + entry.name).replace(/^\/+/, ""),
  ).sort();
}
export function lessonOptions(abortController = new AbortController()): Options {
  return {
    model: MODEL,
    cwd: WORKSPACE,
    tools: ["Glob"],
    allowedTools: ["Glob"],
    systemPrompt: "List the files in your current working directory using Glob with pattern **/*. Report relative paths only. Do not search outside the current directory. Do not invent file names or read file contents.",
    settingSources: [], mcpServers: {}, plugins: [], persistSession: false,
    maxTurns: 4, maxBudgetUsd: 0.15, abortController,
  };
}
export type LabEvent =
  | { type: "started"; text: string }
  | { type: "initialized"; model: string; tools: number }
  | { type: "answer"; text: string }
  | { type: "tool"; name: string; pattern: string }
  | { type: "result"; status: string; text: string; sessionId: string; costUsd: number; turns: number }
  | { type: "error"; text: string };

export function validatePrompt(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Enter a prompt first.");
  if (value.trim().length > 2000) throw new Error("Keep the prompt under 2,000 characters.");
  return value.trim();
}

// Project only student-facing evidence, never the runtime's raw configuration.
export function projectMessage(message: SDKMessage): LabEvent[] {
  if (message.type === "system" && message.subtype === "init") {
    return [{ type: "initialized", model: message.model, tools: message.tools.length }];
  }
  if (message.type === "assistant") {
    const events: LabEvent[] = [];
    for (const block of message.message.content) {
      if (block.type === "text") events.push({ type: "answer", text: block.text });
      if (block.type === "tool_use") {
        const input = block.input as { pattern?: string };
        events.push({ type: "tool", name: block.name, pattern: input.pattern || "" });
      }
    }
    return events;
  }
  if (message.type === "result") {
    const success = message.subtype === "success" && !message.is_error;
    return [{ type: "result", status: success ? "success" : message.subtype === "success" ? "error" : message.subtype,
      text: message.subtype === "success" ? message.result : message.errors.join("\n"),
      sessionId: message.session_id, costUsd: message.total_cost_usd, turns: message.num_turns }];
  }
  return [];
}

export async function runAgent(prompt: string, emit: (event: LabEvent) => void, abortController = new AbortController()) {
  emit({ type: "started", text: "Calling query() once. Waiting for the SDK messages…" });
  let gotResult = false;

  // One SDK entry point. for await consumes its async message iterator.
  const conversation = query({
    prompt,
    options: lessonOptions(abortController),
  });
  try {
    for await (const message of conversation) {
      for (const event of projectMessage(message)) {
        if (event.type === "result") gotResult = true;
        emit(event);
      }
    }
    if (!gotResult && !abortController.signal.aborted) throw new Error("The SDK ended without a result message.");
  } finally {
    conversation.close();
  }
}
