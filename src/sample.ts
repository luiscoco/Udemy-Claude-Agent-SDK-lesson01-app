import { query } from "@anthropic-ai/claude-agent-sdk";
import { DEFAULT_PROMPT, lessonOptions } from "./agent.js";

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your_")) {
  console.error("Set ANTHROPIC_API_KEY in this shell first. See the How to run page.");
  process.exit(1);
}

const conversation = query({ prompt: DEFAULT_PROMPT, options: lessonOptions() });
try {
  for await (const message of conversation) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") console.log(block.text);
        if (block.type === "tool_use") console.log(`Tool: ${block.name}`);
      }
    }
    if (message.type === "result") {
      console.log(`Result: ${message.subtype} · Turns: ${message.num_turns}`);
      if (message.subtype !== "success" || message.is_error) process.exitCode = 1;
    }
  }
} finally {
  conversation.close();
}
