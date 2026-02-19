# Skill Management Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create two Claude Code skills (`discover-skills` and `pull-skills`) for managing skill manifests and pulling skills from GitHub repos.

**Architecture:** Pure SKILL.md for `discover-skills` (agent uses `gh` CLI directly). SKILL.md + TypeScript script for `pull-skills` (script handles deterministic file downloading and prerequisite checking, invoked via `npx tsx`). Both skills auto-discover `skill-manifest.json` by scanning repo root then top-level subdirs.

**Tech Stack:** Claude Code skills (SKILL.md), `gh` CLI, TypeScript (`tsx`), no npm dependencies.

---

### Task 1: Create `discover-skills` SKILL.md

**Files:**
- Create: `.claude/skills/discover-skills/SKILL.md`

**Step 1: Create the skill directory**

Run: `mkdir -p .claude/skills/discover-skills`

**Step 2: Write the SKILL.md**

Create `.claude/skills/discover-skills/SKILL.md` with the following content:

```markdown
---
name: discover-skills
description: Use when adding skills from a GitHub repository to a skill manifest, when setting up a new project with external skills, or when the user says "discover skills" or invokes /discover-skills. Takes an optional GitHub URL argument.
---

# Discover Skills

Interactive skill for browsing a GitHub repo's skill directories and adding selected skills to a local `skill-manifest.json`.

## Input

- Optional argument: a GitHub URL like `https://github.com/obra/superpowers/tree/main/skills`
- If no argument provided, ask the user for the URL

## Process

### 1. Parse the URL

Extract owner, repo, and path from the URL. Supported formats:

- `https://github.com/{owner}/{repo}/tree/{ref}/{path}` — use owner, repo, path (ignore ref)
- `https://github.com/{owner}/{repo}` — use owner, repo; ask user for the subdirectory path

### 2. Resolve version

Fetch the latest tag:

```bash
gh api "repos/{owner}/{repo}/tags" --jq '.[0].name'
```

- If a tag is returned, use it as `version`
- If no tags exist (empty result), fetch the default branch's commit SHA instead:

```bash
gh api "repos/{owner}/{repo}/commits?per_page=1" --jq '.[0].sha'
```

Warn the user: "No tags found. Pinning to commit SHA `{sha}`. Tag pinning is preferred."

### 3. List available skills

Fetch subdirectories at the path:

```bash
gh api "repos/{owner}/{repo}/contents/{path}?ref={version}" --jq '.[] | select(.type == "dir") | .name'
```

Each subdirectory name is a skill.

### 4. Fetch descriptions

For each skill subdirectory, fetch the SKILL.md to extract a description:

```bash
gh api "repos/{owner}/{repo}/contents/{path}/{skill}/SKILL.md?ref={version}" --jq '.content' | base64 --decode | head -20
```

Extract the first meaningful non-frontmatter, non-heading line as the description. If no SKILL.md exists, try the first `.md` file. If no `.md` file exists, show "(no description)".

### 5. Present for selection

Show the user a numbered list with skill name and description. Ask them to multi-select which skills to add. Example:

```
Available skills in obra/superpowers:
1. brainstorming — Help turn ideas into fully formed designs
2. writing-plans — Write comprehensive implementation plans
3. test-driven-development — Use when implementing any feature or bugfix
...

Which skills would you like to add? (comma-separated numbers, or "all")
```

### 6. Locate or create manifest

**Manifest discovery:**
1. Check repo root for `skill-manifest.json`
2. If not found, check each top-level subdirectory for `skill-manifest.json`
3. If multiple found, ask the user which one to use
4. If none found, ask the user:
   - Where to create `skill-manifest.json` (default: repo root)
   - What the target directory should be (where pulled skills will be written)

### 7. Update manifest

Read the existing manifest (or start fresh). The manifest schema:

```json
{
  "target": "skills",
  "sources": [
    {
      "name": "superpowers",
      "repo": "https://github.com/obra/superpowers",
      "path": "skills",
      "version": "v4.3.0",
      "skills": ["brainstorming", "writing-plans"]
    }
  ]
}
```

Rules:
- Source `name` defaults to the repo name (e.g., `superpowers` from `obra/superpowers`)
- If a source with the same repo URL already exists, **merge** the new skills into its `skills` array (additive, deduplicated)
- If a source with the same `name` but different repo URL exists, append the owner to disambiguate (e.g., `superpowers-obra`)
- If this is a new source, append it to the `sources` array
- Write the updated manifest back to disk

### 8. Confirm

Print a summary of what was added:

```
Updated skill-manifest.json:
  Source: superpowers (v4.3.0)
  Added: brainstorming, writing-plans
  Total skills for source: 5

Run pull-skills to download the skill files.
```

## Edge Cases

- `gh` not authenticated → Run `gh auth status` first. If it fails, tell the user to run `gh auth login`.
- Duplicate skill selection → silently skip, don't add twice
- URL without path → ask user for the subdirectory containing skills
- GitHub API rate limit → inform user, suggest authenticating with `gh auth login`

## Important

- Do NOT download any files — that is `pull-skills`' job
- Do NOT modify the target directory — only write to `skill-manifest.json`
- Always use `--jq` with `gh api` to filter JSON responses
```

**Step 3: Commit**

```bash
git add .claude/skills/discover-skills/SKILL.md
git commit -m "feat: add discover-skills skill"
```

---

### Task 2: Create `pull-skills` SKILL.md

**Files:**
- Create: `.claude/skills/pull-skills/SKILL.md`

**Step 1: Create the skill directory**

Run: `mkdir -p .claude/skills/pull-skills`

**Step 2: Write the SKILL.md**

Create `.claude/skills/pull-skills/SKILL.md` with the following content:

```markdown
---
name: pull-skills
description: Use when downloading skills listed in a skill-manifest.json, after running discover-skills, or when the user says "pull skills" or invokes /pull-skills. No arguments needed.
---

# Pull Skills

Downloads skill files from GitHub repos based on the local `skill-manifest.json`. Run `discover-skills` first to set up the manifest.

## Process

Run the pull script:

```bash
npx tsx .claude/skills/pull-skills/pull-skills.ts
```

Report the script's output to the user. If the script exits with an error, report the error message.

## Prerequisites

- Node.js must be installed (for `npx tsx`)
- `gh` CLI must be authenticated (the script shells out to `gh api`)
- `skill-manifest.json` must exist (run `discover-skills` first)

## What the script does

1. Auto-discovers `skill-manifest.json` (repo root first, then top-level subdirs)
2. For each source and skill in the manifest, downloads the full skill directory via `gh api`
3. Writes files to the `target` directory specified in the manifest (relative to manifest location)
4. Checks `prerequisites` entries and warns about missing or version-mismatched CLIs
5. Prints a summary of pulled skills and any warnings

## Important

- Do NOT modify `skill-manifest.json` — this skill only reads it
- If the script fails, check that `gh auth status` succeeds and that the manifest is valid JSON
```

**Step 3: Commit**

```bash
git add .claude/skills/pull-skills/SKILL.md
git commit -m "feat: add pull-skills skill definition"
```

---

### Task 3: Write `pull-skills.ts` — manifest discovery and parsing

**Files:**
- Create: `.claude/skills/pull-skills/pull-skills.ts`

**Step 1: Write the manifest discovery and types**

Create `.claude/skills/pull-skills/pull-skills.ts`:

```typescript
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
```

**Step 2: Run to verify it compiles**

Run: `npx tsx .claude/skills/pull-skills/pull-skills.ts`
Expected: Error about no manifest found (which is correct — no manifest exists yet)

**Step 3: Commit**

```bash
git add .claude/skills/pull-skills/pull-skills.ts
git commit -m "feat: pull-skills script — manifest discovery and types"
```

---

### Task 4: Write `pull-skills.ts` — GitHub API helpers

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts`

**Step 1: Add the GitHub API helper functions**

Append before the end of the file:

```typescript
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
```

**Step 2: Commit**

```bash
git add .claude/skills/pull-skills/pull-skills.ts
git commit -m "feat: pull-skills script — GitHub API helpers"
```

---

### Task 5: Write `pull-skills.ts` — recursive download logic

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts`

**Step 1: Add the recursive download function**

Append before the end of the file:

```typescript
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
```

**Step 2: Commit**

```bash
git add .claude/skills/pull-skills/pull-skills.ts
git commit -m "feat: pull-skills script — recursive download logic"
```

---

### Task 6: Write `pull-skills.ts` — prerequisite checking

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts`

**Step 1: Add the prerequisite checking functions**

Append before the end of the file:

```typescript
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
  const cleanRange = range.replace(/^[\^~]/, "");
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
    execSync(`which ${pkg}`, { stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    warnings.push(
      `Warning: Missing prerequisite: ${pkg} (required by source '${source.name}')\n` +
      `  Install with: npm install -g ${pkg}@${requiredVersion}`
    );
    return warnings;
  }

  // Check version
  try {
    const versionOutput = execSync(`${pkg} --version`, {
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
```

**Step 2: Commit**

```bash
git add .claude/skills/pull-skills/pull-skills.ts
git commit -m "feat: pull-skills script — prerequisite checking"
```

---

### Task 7: Write `pull-skills.ts` — main function

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts`

**Step 1: Add the main function**

Append at the end of the file:

```typescript
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
```

**Step 2: Run the script to verify it works end-to-end**

First, create a test manifest:

```bash
cat > /tmp/test-manifest.json << 'EOF'
{
  "target": "/tmp/test-skills",
  "sources": [
    {
      "name": "superpowers",
      "repo": "https://github.com/obra/superpowers",
      "path": "skills",
      "version": "v4.3.0",
      "skills": ["brainstorming"]
    }
  ]
}
EOF
```

Run from `/tmp` (where the manifest is):

```bash
cd /tmp && npx tsx /Users/pcaplan/paul/flowkay/.claude/skills/pull-skills/pull-skills.ts
```

Expected output:
```
Using manifest: /tmp/test-manifest.json
Target directory: /tmp/test-skills

Source: superpowers (v4.3.0)
  Pulling brainstorming... N files

---
Pulled 1 skills (N files) to /tmp/test-skills
```

Verify the files were downloaded:

```bash
ls -R /tmp/test-skills/brainstorming/
```

Expected: The brainstorming skill's files (at minimum a SKILL.md)

Clean up:

```bash
rm -rf /tmp/test-manifest.json /tmp/test-skills
```

**Step 3: Commit**

```bash
git add .claude/skills/pull-skills/pull-skills.ts
git commit -m "feat: pull-skills script — main function, end-to-end working"
```

---

### Task 8: Manual integration test — full discover + pull workflow

**Step 1: Test `discover-skills`**

Invoke the skill: `/discover-skills https://github.com/obra/superpowers/tree/main/skills`

Verify:
- It resolves the latest tag for `obra/superpowers`
- It lists available skills with descriptions
- After multi-selecting, it creates `skill-manifest.json` (asks for target directory)
- The manifest JSON is valid and contains the selected skills

**Step 2: Test `pull-skills`**

Invoke the skill: `/pull-skills`

Verify:
- It finds the manifest created by discover-skills
- It downloads skill files to the target directory
- It prints a summary of pulled skills
- The skill files exist on disk with correct content

**Step 3: Test additive discover**

Invoke discover-skills again with the same URL but select different skills.

Verify:
- The manifest merges new skills into the existing source entry
- Previously selected skills are preserved
- No duplicates

**Step 4: Commit any fixes**

If issues were found and fixed during testing, commit those fixes.
