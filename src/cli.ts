import { DEFAULT_PROMPT, runAgent, validatePrompt } from "./agent.js";

const prompt = validatePrompt(process.argv.slice(2).join(" ") || DEFAULT_PROMPT);
try {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your_")) throw new Error("Missing key");
  await runAgent(prompt, (event) => {
    if (event.type === "tool") console.log(`Tool: ${event.name} · ${event.pattern}`);
    if (event.type === "answer") console.log(event.text);
    if (event.type === "result") {
      console.log(`\nResult: ${event.status} · Turns: ${event.turns} · Cost: $${event.costUsd.toFixed(4)}`);
      if (event.status !== "success") { console.error(event.text); process.exitCode = 1; }
    }
  });
} catch {
  console.error("Set ANTHROPIC_API_KEY in the same shell that runs npm run sample. For an optional .env file, use npm run sample:env. Also check model access and Git Bash setup.");
  process.exitCode = 1;
}
