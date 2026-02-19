import { execSync, execFileSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

// --- Types ---

interface Prerequisite {
  package: string;
  version: string;
}

interface RepoSource {
  type?: "repo";
  name: string;
  repo: string;
  path: string;
  version: string;
  skills: string[];
  prerequisites?: {
    cli: Prerequisite;
  };
}

interface GenerateSource {
  type: "generate";
  name: string;
  package: string;
  command: string;
  version: string;
  skills: string[];
  installedVersion?: string;
  prerequisites?: {
    cli: Prerequisite;
  };
}

type Source = RepoSource | GenerateSource;

function isGenerateSource(source: Source): source is GenerateSource {
  return source.type === "generate";
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

// --- Generate Source ---

function pullGenerateSource(
  source: GenerateSource,
  targetDir: string,
  manifestDir: string
): { generated: number; version: string } | { skipped: true } | { error: string } {
  // 1. Check the CLI is installed and get its version
  const installedVersion = getInstalledVersion(source.package);

  if (installedVersion === null) {
    return { error: `${source.package} is not installed` };
  }

  // 2. Check installed version satisfies the required range
  if (!satisfiesSemverRange(installedVersion, source.version)) {
    return {
      error: `${source.package} ${installedVersion} does not satisfy required version ${source.version}`,
    };
  }

  // 3. If installed version matches what we last generated with, skip
  if (source.installedVersion && source.installedVersion === installedVersion) {
    return { skipped: true };
  }

  // 4. Run the command from manifestDir
  const parts = source.command.split(/\s+/);
  const program = parts[0];
  const args = parts.slice(1);

  try {
    execFileSync(program, args, {
      cwd: manifestDir,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    return { error: `Command failed: ${source.command}\n${stderr}` };
  }

  // 5. Verify each skill exists as <targetDir>/<skillName>/SKILL.md
  for (const skill of source.skills) {
    const skillFile = join(targetDir, skill, "SKILL.md");
    if (!existsSync(skillFile)) {
      return {
        error: `Expected skill file not found after generation: ${skillFile}`,
      };
    }
  }

  // 6. Return success with the installed version
  return { generated: source.skills.length, version: installedVersion };
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

function getInstalledVersion(pkg: string): string | null {
  // Check if CLI exists
  try {
    execFileSync("which", [pkg], { stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    return null;
  }

  // Get version string
  try {
    const versionOutput = execFileSync(pkg, ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Verify it contains a parseable version
    const parts = parseVersion(versionOutput);
    if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0) {
      return null;
    }

    return versionOutput;
  } catch {
    return null;
  }
}

function checkPrerequisites(source: Source): string[] {
  const warnings: string[] = [];
  if (!source.prerequisites?.cli) return warnings;

  const { package: pkg, version: requiredVersion } = source.prerequisites.cli;

  const installedVersion = getInstalledVersion(pkg);

  if (installedVersion === null) {
    // Distinguish "not installed" from "can't determine version"
    let isInstalled = false;
    try {
      execFileSync("which", [pkg], { stdio: ["pipe", "pipe", "pipe"] });
      isInstalled = true;
    } catch {}

    if (!isInstalled) {
      warnings.push(
        `Warning: Missing prerequisite: ${pkg} (required by source '${source.name}')\n` +
        `  Install with: npm install -g ${pkg}@${requiredVersion}`
      );
    } else {
      warnings.push(
        `Warning: Could not determine version of ${pkg} (source '${source.name}')`
      );
    }
    return warnings;
  }

  if (!satisfiesSemverRange(installedVersion, requiredVersion)) {
    warnings.push(
      `Warning: Version mismatch: ${pkg} ${installedVersion} installed, requires ${requiredVersion} (source '${source.name}')\n` +
      `  Update with: npm install -g ${pkg}@${requiredVersion}`
    );
  }

  return warnings;
}

// --- Main ---

function main() {
  const { path: manifestPath, dir: manifestDir } = findManifest();
  console.log(`Using manifest: ${manifestPath}`);

  const manifest = readManifest(manifestPath);

  // Only check gh auth if there are repo sources
  const hasRepoSources = manifest.sources.some((s) => !isGenerateSource(s));
  if (hasRepoSources) {
    try {
      execSync("gh auth status", { stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      console.error("Error: gh CLI is not authenticated.");
      console.error("Run: gh auth login");
      process.exit(1);
    }
  }

  const targetDir = resolve(manifestDir, manifest.target);
  mkdirSync(targetDir, { recursive: true });

  console.log(`Target directory: ${targetDir}\n`);

  let totalFiles = 0;
  let totalPulled = 0;
  let totalGenerated = 0;
  const errors: string[] = [];
  const allWarnings: string[] = [];
  const generatedUpdates: { sourceIndex: number; version: string }[] = [];

  for (let i = 0; i < manifest.sources.length; i++) {
    const source = manifest.sources[i];

    if (isGenerateSource(source)) {
      console.log(`Source: ${source.name} (generate, ${source.version})`);

      const result = pullGenerateSource(source, targetDir, manifestDir);

      if ("skipped" in result) {
        console.log(`  Up to date (${source.installedVersion})`);
      } else if ("error" in result) {
        console.log(`  FAILED: ${result.error}`);
        errors.push(`  ${source.name}: ${result.error}`);
      } else {
        console.log(`  Generated ${result.generated} skills`);
        totalGenerated += result.generated;
        generatedUpdates.push({ sourceIndex: i, version: result.version });
      }
    } else {
      console.log(`Source: ${source.name} (${source.version})`);
      const { owner, repo } = parseRepoUrl(source.repo);

      for (const skill of source.skills) {
        process.stdout.write(`  Pulling ${skill}...`);
        const result = pullSkill(owner, repo, source.path, skill, source.version, targetDir);

        if ("error" in result) {
          console.log(` FAILED`);
          errors.push(`  ${source.name}/${skill}: ${result.error}`);
        } else {
          console.log(` ${result.files} files`);
          totalFiles += result.files;
          totalPulled++;
        }
      }
    }

    // Check prerequisites
    const warnings = checkPrerequisites(source);
    allWarnings.push(...warnings);

    console.log();
  }

  // Summary
  console.log("---");
  const parts: string[] = [];
  if (totalFiles > 0) {
    parts.push(`pulled ${totalPulled} skills (${totalFiles} files)`);
  }
  if (totalGenerated > 0) {
    parts.push(`generated ${totalGenerated} skills`);
  }
  if (parts.length === 0) {
    parts.push("no skills updated");
  }
  console.log(`Done: ${parts.join(", ")} in ${targetDir}`);

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

  // Write back installedVersion for any generate sources that ran
  if (generatedUpdates.length > 0) {
    const rawManifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(rawManifest);
    for (const entry of generatedUpdates) {
      parsed.sources[entry.sourceIndex].installedVersion = entry.version;
    }
    writeFileSync(manifestPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
    console.log("\nUpdated manifest with installed versions.");
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
