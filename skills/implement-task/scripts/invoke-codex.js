#!/usr/bin/env node
/**
 * invoke-codex.js
 *
 * Helper script that invokes OpenAI Codex via the @openai/codex-sdk,
 * enforces structured output via Zod, accumulates token usage, and
 * outputs JSON to stdout.
 *
 * Usage:
 *   echo "<prompt>" | node invoke-codex.js --cwd <dir> [--timeout <ms>] [--verbose]
 *     [--sandbox-mode <mode>] [--approval-policy <policy>]
 *   node invoke-codex.js --check
 *
 * Flags:
 *   --verbose                 Stream progress events to stderr (default: silent)
 *   --sandbox-mode <mode>     Codex sandbox mode (default: workspace-write-access)
 *   --approval-policy <pol>   Codex approval policy (default: auto)
 */

import { execSync, spawnSync } from "child_process";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// ── Script directory (for auto-install) ──────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    check: false,
    cwd: process.cwd(),
    timeout: 0, // 0 = no timeout
    verbose: false,
    sandboxMode: "workspace-write-access",
    approvalPolicy: "auto",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") {
      args.check = true;
    } else if (arg === "--cwd" && argv[i + 1]) {
      args.cwd = argv[++i];
    } else if (arg === "--timeout" && argv[i + 1]) {
      args.timeout = parseInt(argv[++i], 10);
    } else if (arg === "--verbose") {
      args.verbose = true;
    } else if (arg === "--sandbox-mode" && argv[i + 1]) {
      args.sandboxMode = argv[++i];
    } else if (arg === "--approval-policy" && argv[i + 1]) {
      args.approvalPolicy = argv[++i];
    }
  }

  return args;
}

// ── Availability check ────────────────────────────────────────────────────────

function isCodexCliOnPath() {
  try {
    execSync("which codex", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isSdkInstalled() {
  const sdkPath = path.join(__dirname, "node_modules", "@openai", "codex-sdk");
  return fs.existsSync(sdkPath);
}

function autoInstallSdk() {
  process.stderr.write("Installing Codex SDK...\n");
  const result = spawnSync("npm", ["install", "--prefix", __dirname], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `npm install failed:\n${result.stderr || result.stdout || "unknown error"}`
    );
  }
}

async function checkAvailability() {
  const cliAvailable = isCodexCliOnPath();

  if (!cliAvailable) {
    outputJson({
      available: false,
      reason:
        'The "codex" CLI is not on PATH. Install it with: npm install -g @openai/codex',
    });
    return;
  }

  if (!isSdkInstalled()) {
    try {
      autoInstallSdk();
    } catch (err) {
      outputJson({
        available: false,
        reason: `Auto-install of @openai/codex-sdk failed: ${err.message}`,
      });
      return;
    }
  }

  outputJson({ available: true });
}

// ── Output helpers ─────────────────────────────────────────────────────────────

function outputJson(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// logProgress only writes when verbose mode is enabled.
// Pass the args object so the flag is respected throughout.
function makeLogger(verbose) {
  return function logProgress(msg) {
    if (verbose) {
      process.stderr.write(`[codex] ${msg}\n`);
    }
  };
}

// Sanitize a shell command string for logging: truncate and strip potential secrets.
// Only used in verbose mode, but sanitized regardless.
function sanitizeCommand(cmd) {
  if (typeof cmd !== "string") return String(cmd);
  // Replace sequences that look like tokens/keys (long alphanumeric strings)
  const sanitized = cmd.replace(/\b[A-Za-z0-9_\-]{40,}\b/g, "[REDACTED]");
  return sanitized.slice(0, 120) + (sanitized.length > 120 ? "…" : "");
}

// ── Read stdin ─────────────────────────────────────────────────────────────────

async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on("line", (line) => chunks.push(line));
    rl.on("close", () => resolve(chunks.join("\n")));
    rl.on("error", reject);
  });
}

// ── Main invocation ────────────────────────────────────────────────────────────

async function invoke(args) {
  const logProgress = makeLogger(args.verbose);

  // Ensure SDK is installed before importing it
  if (!isSdkInstalled()) {
    if (!isCodexCliOnPath()) {
      outputJson({
        success: false,
        summary: 'The "codex" CLI is not on PATH.',
        filesChanged: [],
        usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
      });
      process.exitCode = 1;
      return;
    }
    try {
      autoInstallSdk();
    } catch (err) {
      outputJson({
        success: false,
        summary: `Failed to install @openai/codex-sdk: ${err.message}`,
        filesChanged: [],
        usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
      });
      process.exitCode = 1;
      return;
    }
  }

  // Dynamic import after ensuring SDK is installed — wrapped in try/catch so
  // any import failure produces JSON output rather than a raw stack trace.
  let Codex, z, zodToJsonSchema;
  try {
    ({ Codex } = await import("@openai/codex-sdk"));
    ({ z } = await import("zod"));
    ({ zodToJsonSchema } = await import("zod-to-json-schema"));
  } catch (err) {
    outputJson({
      success: false,
      summary: `Failed to load required modules: ${err.message}`,
      filesChanged: [],
      usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    });
    process.exitCode = 1;
    return;
  }

  // Define the output schema
  const outputSchema = z.object({
    success: z.boolean(),
    summary: z.string(),
    filesChanged: z.array(z.string()),
  });

  // Convert Zod schema to JSON schema for the SDK
  let outputSchemaJson;
  try {
    outputSchemaJson =
      zodToJsonSchema(outputSchema, {
        name: "CodexOutput",
        $refStrategy: "none",
      }).definitions?.CodexOutput ?? zodToJsonSchema(outputSchema);
  } catch (err) {
    outputJson({
      success: false,
      summary: `Failed to convert output schema: ${err.message}`,
      filesChanged: [],
      usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    });
    process.exitCode = 1;
    return;
  }

  // Read prompt from stdin — wrapped so pipe errors produce JSON output.
  let prompt;
  try {
    prompt = await readStdin();
  } catch (err) {
    outputJson({
      success: false,
      summary: `Failed to read prompt from stdin: ${err.message}`,
      filesChanged: [],
      usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    });
    process.exitCode = 1;
    return;
  }

  if (!prompt.trim()) {
    outputJson({
      success: false,
      summary: "No prompt provided via stdin.",
      filesChanged: [],
      usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    });
    process.exitCode = 1;
    return;
  }

  // Accumulated usage across all turns
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
  };

  // Set up timeout via AbortController
  const controller = new AbortController();
  let timeoutHandle = null;
  let timedOut = false;

  if (args.timeout > 0) {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, args.timeout);
  }

  try {
    const codex = new Codex();
    const thread = codex.startThread({
      workingDirectory: args.cwd,
      sandboxMode: args.sandboxMode,
      approvalPolicy: args.approvalPolicy,
    });

    logProgress(`Starting thread in ${args.cwd}`);

    const { events } = await thread.runStreamed(prompt, {
      outputSchema: outputSchemaJson,
      signal: controller.signal,
    });

    let finalResponse = null;
    let turnFailed = false;
    let turnFailureMsg = "";

    for await (const event of events) {
      switch (event.type) {
        case "thread.started":
          logProgress(`Thread started: ${event.thread_id}`);
          break;

        case "turn.started":
          logProgress("Turn started");
          break;

        case "turn.completed":
          if (event.usage) {
            usage.inputTokens += event.usage.input_tokens ?? 0;
            usage.outputTokens += event.usage.output_tokens ?? 0;
            usage.cachedInputTokens += event.usage.cached_input_tokens ?? 0;
          }
          logProgress(
            `Turn completed (in:${event.usage?.input_tokens ?? 0} out:${event.usage?.output_tokens ?? 0})`
          );
          break;

        case "turn.failed":
          turnFailed = true;
          turnFailureMsg = event.error?.message ?? "Unknown turn failure";
          logProgress(`Turn failed: ${turnFailureMsg}`);
          break;

        case "item.started":
          logProgress(`Item started: ${event.item.type}`);
          if (event.item.type === "command_execution") {
            logProgress(`  cmd: ${sanitizeCommand(event.item.command)}`);
          }
          break;

        case "item.updated":
          // Emit partial command output for visibility (verbose only)
          if (event.item.type === "command_execution" && event.item.aggregated_output) {
            const lines = event.item.aggregated_output.trim().split("\n");
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
              logProgress(`  > ${lastLine}`);
            }
          }
          break;

        case "item.completed":
          if (event.item.type === "agent_message") {
            finalResponse = event.item.text;
            logProgress("Agent message received");
          } else if (event.item.type === "file_change") {
            const filePaths = event.item.changes.map((c) => c.path).join(", ");
            logProgress(`Files changed: ${filePaths} (${event.item.status})`);
          } else if (event.item.type === "command_execution") {
            logProgress(
              `Command completed (exit ${event.item.exit_code ?? "?"}: ${sanitizeCommand(event.item.command)})`
            );
          }
          break;

        case "error":
          logProgress(`Error: ${event.message}`);
          break;

        default:
          break;
      }
    }

    if (timeoutHandle) clearTimeout(timeoutHandle);

    // Parse final structured response
    if (finalResponse) {
      try {
        const parsed = JSON.parse(finalResponse);
        // Validate with Zod
        const validated = outputSchema.parse(parsed);
        outputJson({ ...validated, usage });
        return;
      } catch (err) {
        logProgress(`Failed to parse/validate structured response: ${err.message}`);
        // Fall through to failure output
      }
    }

    if (turnFailed) {
      outputJson({
        success: false,
        summary: `Codex turn failed: ${turnFailureMsg}`,
        filesChanged: [],
        usage,
      });
      return;
    }

    outputJson({
      success: false,
      summary: "Codex did not produce a structured response.",
      filesChanged: [],
      usage,
    });
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (timedOut || err.name === "AbortError") {
      logProgress("Execution timed out");
      outputJson({
        success: false,
        summary: "timeout",
        filesChanged: [],
        usage,
      });
      process.exitCode = 1;
      return;
    }

    logProgress(`Unexpected error: ${err.message}`);
    outputJson({
      success: false,
      summary: `Unexpected error: ${err.message}`,
      filesChanged: [],
      usage,
    });
    process.exitCode = 1;
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv);

if (args.check) {
  await checkAvailability();
} else {
  await invoke(args);
}
