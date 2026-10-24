# Claude Agent SDK · Lesson 01 · Install, configure and run

Teach the first three steps: install the SDK, set an API key in the same shell, and ask **What files are here?** This complete TypeScript app includes five linked student pages, a UML SVG, coloured code snippets and the course visual assets.

## What you will learn

- Install the SDK: Create a Node project, choose TypeScript, install the Agent SDK and run TypeScript with tsx.
- Set the key in the same shell: Set ANTHROPIC_API_KEY in PowerShell or Bash before starting the agent. Child processes inherit it; another terminal does not inherit a later assignment.
- Ask the first question: Submit exactly “What files are here?” and print the assistant text and final outcome.
- Choose a working directory: cwd points to sample-workspace. The question refers to that directory, not your entire computer or the folder holding .env.
- Observe a real tool call: Glob lists file paths. tools makes it available; allowedTools pre-approves it. Shell, file-reading and editing tools are not enabled.
- Check completion: A tool request and assistant text are progress. Check the final result subtype and error flag before reporting success.

## Configure and run the completed application

```powershell
git clone https://github.com/luiscoco/Udemy-Claude-Agent-SDK-lesson01-app.git
cd .\Udemy-Claude-Agent-SDK-lesson01-app
npm ci
$env:ANTHROPIC_API_KEY = "your_api_key"
# Check presence without printing the key:
node -e "console.log(Boolean(process.env.ANTHROPIC_API_KEY))"
npm run sample
```

Use your own key; the example is a placeholder. Keep the same terminal. The terminal sample does not load .env automatically. For the original presentations workspace, use `cd .\agent-sdk\lesson01-getting-started` instead of the clone commands.

Optional .env workflow:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm run sample:env
npm start
```

Open http://127.0.0.1:3100. Keep the terminal open; Ctrl+C stops it. The web start command explicitly loads an optional .env file. A shell key takes precedence over the file. Restart after edits. Use the printed URL if PORT changes. Starting the server does not call Claude.

```dotenv
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MODEL=claude-sonnet-4-6
PORT=3100
```

On Windows, if needed, add `CLAUDE_CODE_GIT_BASH_PATH=C:/Program Files/Git/bin/bash.exe`. Use Node.js 24+, keep optional npm dependencies enabled, and select a model your account can access.

## Create a new TypeScript project from scratch

```powershell
mkdir my-agent
cd my-agent
npm init -y
npm pkg set type=module
npm install @anthropic-ai/claude-agent-sdk@0.3.310
npm install --save-dev tsx typescript @types/node
mkdir sample-workspace
"Hello, students!" | Set-Content sample-workspace/notes.txt
```

Copy examples/first-agent.ts into that project as agent.ts. Set the key in that shell, then run `npx tsx agent.ts`. TypeScript is the implemented language for this lab; the official SDK also supports Python.

## Expected evidence

The completed app points cwd at sample-workspace. Expect a real Glob tool call and these relative paths: notes.txt, src/hello.ts, todo.md. The assistant wording, number of model turns and estimated cost can vary. A final success subtype with is_error false establishes completion. The labelled browser reference list comes from the host and is not passed to query as its answer.

## How the app was built

### 01. Install a TypeScript project

The SDK is the runtime dependency. tsx executes TypeScript; type=module enables ES modules. npm ci reproduces this completed app from its lockfile.

Source: [package.json](package.json)

```powershell
mkdir my-agent
cd my-agent
npm init -y
npm pkg set type=module
npm install @anthropic-ai/claude-agent-sdk@0.3.310
npm install --save-dev tsx typescript @types/node
mkdir sample-workspace
"Hello, students!" | Set-Content sample-workspace/notes.txt
```

### 02. Pass the key through the process environment

The terminal sample does not load .env. It checks the inherited environment before creating a query. npm run sample:env explicitly loads the optional local file instead.

Source: [src/sample.ts](src/sample.ts)

```typescript
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your_")) {
  console.error("Set ANTHROPIC_API_KEY in this shell first. See the How to run page.");
  process.exit(1);
}
```

### 03. Give the agent a small directory and Glob

The fixed cwd is sample-workspace. Only Glob is available and pre-approved. Four SDK turns leave room for discovery and a final answer; one query call can contain several model turns.

Source: [src/agent.ts](src/agent.ts)

```typescript
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
```

### 04. Ask the exact first question

query receives the literal lesson prompt through DEFAULT_PROMPT and returns an async iterator. The same options power the CLI and the web lab.

Source: [src/sample.ts](src/sample.ts)

```typescript
const conversation = query({ prompt: DEFAULT_PROMPT, options: lessonOptions() });
```

### 05. Print tool activity, text and the final result

Print only human-readable text and tool names, followed by the final subtype. is_error also matters even when a subtype says success. finally closes the query object.

Source: [src/sample.ts](src/sample.ts)

```typescript
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
```

### 06. Forward selected events to the browser

The host projects text, tool calls and the final result into student-facing events. It does not send the API key or raw runtime configuration.

Source: [src/agent.ts](src/agent.ts)

```typescript
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
```

### 07. Compare answer with real local evidence

The host reads the demo directory for a labelled reference list. That reference is not supplied to query as an answer. The browser uses textContent, and the live recording verifies an actual Glob call.

Source: [src/client.ts](src/client.ts)

```typescript
async function configure() {
  const config = await (await fetch("/api/config")).json();
  ($("prompt") as HTMLTextAreaElement).value = config.defaultPrompt;
  $("model").textContent = config.model;
  $("files").textContent = config.sampleFiles.join("\n");
  $("configuration").textContent = config.ready ? "API key configured on the server" : "Setup needed: add your API key in .env";
  ($("run") as HTMLButtonElement).disabled = !config.ready;
}
```

## Student pages and maintenance

The application navigation links the lab, learning goals, setup/run guide, UML architecture and code walkthrough. All pages use large text, the shared light/dark preference, syntax colouring and bundled visual assets.

```powershell
npm test
npm run build:client
python scripts/build-pages.py
```

The generator works with bundled assets and needs no sibling lesson. Tests check prompt/message handling, demo-directory options and duplicate-start behaviour without API calls. If this app is already listening, a second npm start prints its URL. If another service owns the port, stop it or choose a different PORT.

## Scope and repository contents

Glob is the only available tool. The sample enables no shell, file-reading or editing tool, no MCP servers or plugins, and no transcript persistence. A fixed cwd and instructions are not an operating-system sandbox. This is a trusted local teaching app, not a multi-user service. Four turns and a small SDK budget bound the exercise but do not guarantee billing. Closing the web connection cancels this app’s local run.

Source, student pages, demo files, tests, lockfile and visual assets are included. Videos, audio, PowerPoint files, teaching-material, dependencies and the real .env remain local and are ignored by Git.

## Official references

- [Agent SDK quickstart: installation and environment authentication](https://code.claude.com/docs/en/agent-sdk/quickstart)
- [Tool availability and permissions](https://code.claude.com/docs/en/agent-sdk/permissions)
