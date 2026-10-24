import { query } from "@anthropic-ai/claude-agent-sdk";
import { resolve } from "node:path";

// Run from the project root, after setting the key in this shell.
if (!process.env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY in this shell first.");

for await (const message of query({
  prompt: "What files are here?",
  options: {
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    cwd: resolve("sample-workspace"),
    tools: ["Glob"],
    allowedTools: ["Glob"],
    systemPrompt: "Use Glob to list relative file paths in the current directory only. Do not invent names or read contents.",
    settingSources: [], mcpServers: {}, plugins: [], persistSession: false,
    maxTurns: 4, maxBudgetUsd: 0.15,
  },
})) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") console.log(block.text);
      if (block.type === "tool_use") console.log(`Tool: ${block.name}`);
    }
  }
  if (message.type === "result") {
    console.log(`Result: ${message.subtype}`);
    if (message.subtype !== "success" || message.is_error) process.exitCode = 1;
  }
}
