import { execSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, resolve } from "path";

// --- Types ---

interface Prerequisite {
  package: string;
  version: string;
}

interface Source {
  name: string;
  repo: string;
  path: string;
  version: string;
  skills: string[];
  prerequisites?: {
    cli: Prerequisite;
  };
}

interface Manifest {
  target: string;
  sources: Source[];
}

interface GitHubContentEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
}

// --- Manifest Discovery ---

function findManifest(): { path: string; dir: string } {
  const rootManifest = join(process.cwd(), "skill-manifest.json");
  if (existsSync(rootManifest)) {
    return { path: rootManifest, dir: process.cwd() };
  }

  const found: { path: string; dir: string }[] = [];
  const entries = readdirSync(process.cwd());
  for (const entry of entries) {
    const fullPath = join(process.cwd(), entry);
    if (statSync(fullPath).isDirectory() && !entry.startsWith(".")) {
      const candidate = join(fullPath, "skill-manifest.json");
      if (existsSync(candidate)) {
        found.push({ path: candidate, dir: fullPath });
      }
    }
  }

  if (found.length === 0) {
    console.error("Error: No skill-manifest.json found.");
    console.error("Run discover-skills first to create one.");
    process.exit(1);
  }

  if (found.length === 1) {
    return found[0];
  }

  console.error("Error: Multiple skill-manifest.json files found:");
  for (const f of found) {
    console.error(`  - ${f.path}`);
  }
  console.error("Please specify which one by running from the appropriate directory.");
  process.exit(1);
}

function readManifest(manifestPath: string): Manifest {
  const raw = readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as Manifest;
}

// --- GitHub API Helpers ---

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  // Handles: https://github.com/owner/repo or https://github.com/owner/repo.git
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error(`Cannot parse repo URL: ${repoUrl}`);
  }
  return { owner: match[1], repo: match[2] };
}

function ghApi(endpoint: string): string {
  try {
    return execSync(`gh api "${endpoint}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err: any) {
    throw new Error(`GitHub API call failed: ${endpoint}\n${err.stderr || err.message}`);
  }
}

function fetchDirectoryContents(owner: string, repo: string, path: string, ref: string): GitHubContentEntry[] {
  const raw = ghApi(`repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
  return JSON.parse(raw) as GitHubContentEntry[];
}

function fetchFileContent(owner: string, repo: string, path: string, ref: string): string {
  const raw = ghApi(`repos/${owner}/${repo}/contents/${path}?ref=${ref}`);
  const entry = JSON.parse(raw) as GitHubContentEntry;
  if (!entry.content || entry.encoding !== "base64") {
    throw new Error(`Unexpected content format for ${path}`);
  }
  return Buffer.from(entry.content, "base64").toString("utf-8");
}

// --- Download Logic ---

function downloadDirectory(
  owner: string,
  repo: string,
  remotePath: string,
  ref: string,
  localDir: string
): number {
  let fileCount = 0;
  mkdirSync(localDir, { recursive: true });

  const entries = fetchDirectoryContents(owner, repo, remotePath, ref);
  for (const entry of entries) {
    const localPath = join(localDir, entry.name);
    if (entry.type === "dir") {
      fileCount += downloadDirectory(owner, repo, entry.path, ref, localPath);
    } else {
      const content = fetchFileContent(owner, repo, entry.path, ref);
      writeFileSync(localPath, content, "utf-8");
      fileCount++;
    }
  }
  return fileCount;
}

function pullSkill(
  owner: string,
  repo: string,
  basePath: string,
  skillName: string,
  ref: string,
  targetDir: string
): { files: number } | { error: string } {
  const remotePath = `${basePath}/${skillName}`;
  const localDir = join(targetDir, skillName);

  try {
    const files = downloadDirectory(owner, repo, remotePath, ref, localDir);
    return { files };
  } catch (err: any) {
    return { error: err.message };
  }
}
