import { execSync, execFileSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

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
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`Error: ${manifestPath} contains invalid JSON.`);
    process.exit(1);
  }
  if (!parsed.target || !Array.isArray(parsed.sources)) {
    console.error(`Error: ${manifestPath} is missing required fields "target" or "sources".`);
    process.exit(1);
  }
  return parsed as Manifest;
}

// --- GitHub API Helpers ---

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  // Parse GitHub URLs by extracting path segments.
  // Handles: https://github.com/owner/repo, https://github.com/owner/repo.git,
  // repos with dots (owner/my.repo), and URLs with extra paths (/tree/main/...)
  let pathname: string;
  try {
    pathname = new URL(repoUrl).pathname;
  } catch {
    throw new Error(`Cannot parse repo URL: ${repoUrl}`);
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`Cannot parse repo URL: ${repoUrl}`);
  }
  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");
  return { owner, repo };
}

function ghApi(endpoint: string): string {
  try {
    return execFileSync("gh", ["api", endpoint], {
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
    if (entry.name.includes("..") || entry.name.includes("/")) {
      throw new Error(`Unsafe filename in remote path: ${entry.name}`);
    }
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

// --- Prerequisite Checking ---

function parseVersion(versionStr: string): number[] {
  // Extract version numbers from strings like "v1.2.3", "1.2.3", "openspec/1.2.3"
  const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

function satisfiesSemverRange(installed: string, range: string): boolean {
  // Supports ^x.y.z (compatible with version) and exact x.y.z
  const installedParts = parseVersion(installed);
  const cleanRange = range.replace(/^\^/, "");
  const rangeParts = parseVersion(cleanRange);

  if (range.startsWith("^")) {
    // ^x.y.z: major must match, installed >= range
    if (installedParts[0] !== rangeParts[0]) return false;
    if (installedParts[1] > rangeParts[1]) return true;
    if (installedParts[1] < rangeParts[1]) return false;
    return installedParts[2] >= rangeParts[2];
  }

  // Exact match
  return (
    installedParts[0] === rangeParts[0] &&
    installedParts[1] === rangeParts[1] &&
    installedParts[2] === rangeParts[2]
  );
}

function checkPrerequisites(source: Source): string[] {
  const warnings: string[] = [];
  if (!source.prerequisites?.cli) return warnings;

  const { package: pkg, version: requiredVersion } = source.prerequisites.cli;

  // Check if CLI exists
  try {
    execFileSync("which", [pkg], { stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    warnings.push(
      `Warning: Missing prerequisite: ${pkg} (required by source '${source.name}')\n` +
      `  Install with: npm install -g ${pkg}@${requiredVersion}`
    );
    return warnings;
  }

  // Check version
  try {
    const versionOutput = execFileSync(pkg, ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (!satisfiesSemverRange(versionOutput, requiredVersion)) {
      warnings.push(
        `Warning: Version mismatch: ${pkg} ${versionOutput} installed, requires ${requiredVersion} (source '${source.name}')\n` +
        `  Update with: npm install -g ${pkg}@${requiredVersion}`
      );
    }
  } catch {
    warnings.push(
      `Warning: Could not determine version of ${pkg} (source '${source.name}')`
    );
  }

  return warnings;
}

// --- Main ---

function main() {
  // Check gh is available
  try {
    execSync("gh auth status", { stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    console.error("Error: gh CLI is not authenticated.");
    console.error("Run: gh auth login");
    process.exit(1);
  }

  const { path: manifestPath, dir: manifestDir } = findManifest();
  console.log(`Using manifest: ${manifestPath}`);

  const manifest = readManifest(manifestPath);
  const targetDir = resolve(manifestDir, manifest.target);
  mkdirSync(targetDir, { recursive: true });

  console.log(`Target directory: ${targetDir}\n`);

  let totalFiles = 0;
  let totalSkills = 0;
  const errors: string[] = [];
  const allWarnings: string[] = [];

  for (const source of manifest.sources) {
    const { owner, repo } = parseRepoUrl(source.repo);
    console.log(`Source: ${source.name} (${source.version})`);

    for (const skill of source.skills) {
      process.stdout.write(`  Pulling ${skill}...`);
      const result = pullSkill(owner, repo, source.path, skill, source.version, targetDir);

      if ("error" in result) {
        console.log(` FAILED`);
        errors.push(`  ${source.name}/${skill}: ${result.error}`);
      } else {
        console.log(` ${result.files} files`);
        totalFiles += result.files;
        totalSkills++;
      }
    }

    // Check prerequisites
    const warnings = checkPrerequisites(source);
    allWarnings.push(...warnings);

    console.log();
  }

  // Summary
  console.log("---");
  console.log(`Pulled ${totalSkills} skills (${totalFiles} files) to ${targetDir}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const err of errors) {
      console.log(err);
    }
  }

  if (allWarnings.length > 0) {
    console.log();
    for (const warning of allWarnings) {
      console.log(warning);
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
