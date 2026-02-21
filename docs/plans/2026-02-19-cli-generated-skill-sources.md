# CLI-Generated Skill Sources Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add support for CLI-generated skill sources (like OpenSpec) to pull-skills, so the manifest can track tools that generate skills via a CLI command rather than hosting them as static files in a repo.

**Architecture:** Add a `type` field to manifest sources. Sources without `type` (or `type: "repo"`) use the existing GitHub download path. Sources with `type: "generate"` run an external CLI command, verify the expected skills appeared, and write back the installed CLI version to the manifest.

**Tech Stack:** TypeScript (existing pull-skills.ts script), Node.js child_process, fs

---

### Task 1: Update Type Definitions

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts:6-26` (Types section)

The `Source` interface currently requires `repo` and `path`, which don't apply to generate sources. Split into a discriminated union based on `type`:

- `RepoSource`: current fields (`repo`, `path` required), `type` optional (defaults to `"repo"`)
- `GenerateSource`: `type: "generate"`, `package`, `command`, `version` (semver range), `skills`, optional `installedVersion`
- Both share: `name`, `version`, `skills`, `prerequisites`
- `Source = RepoSource | GenerateSource`

Helper: add a type guard `isGenerateSource(source): source is GenerateSource` that checks `source.type === "generate"`.

**Step 1: Update the types**

Modify the `Source` interface into `RepoSource`, `GenerateSource`, and `Source` union. Add `GenerateSource` fields: `type`, `package`, `command`, `installedVersion`. Make `repo` and `path` only on `RepoSource`.

**Step 2: Fix type errors**

The existing code in `main()` accesses `source.repo` and `source.path` unconditionally. These now only exist on `RepoSource`. Wrap the existing repo logic in an `if (!isGenerateSource(source))` guard so TypeScript is satisfied. Generate sources get a placeholder `console.log("Skipping generate source (not yet implemented)")` for now.

**Step 3: Run to verify no regressions**

Run: `npx tsx .claude/skills/pull-skills/pull-skills.ts` (will fail at "no manifest found" which is expected — confirms it compiles and runs)

**Step 4: Commit**

```
feat: add generate source type definitions to pull-skills
```

---

### Task 2: Extract `getInstalledVersion` Helper

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts` (Prerequisite Checking section)

The existing `checkPrerequisites` function checks if a CLI is installed and gets its version, but it returns warnings as strings rather than structured data. We need a reusable function that returns the installed version of a CLI package.

**Step 1: Create `getInstalledVersion` function**

Add a function that takes a package name, runs `<package> --version`, parses the version string using the existing `parseVersion` function, and returns the version string or `null` if not installed. This extracts and reuses logic already in `checkPrerequisites` (lines 222-249).

**Step 2: Refactor `checkPrerequisites` to use it**

Have `checkPrerequisites` call `getInstalledVersion` internally instead of duplicating the "which" + "--version" logic.

**Step 3: Run to verify no regressions**

Same compilation check as before.

**Step 4: Commit**

```
refactor: extract getInstalledVersion helper from checkPrerequisites
```

---

### Task 3: Implement `pullGenerateSource`

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts` (new section between Download Logic and Prerequisite Checking)

This is the core new function. It handles the generate source flow:

1. Check the CLI is installed and get its version (using `getInstalledVersion`)
2. If not installed or doesn't satisfy `version` range: return error
3. If installed version matches `installedVersion`: skip (already up to date), return skip result
4. Run the `command` using `execFileSync` — split the command string into program + args. Run from `manifestDir` (the directory containing the manifest, used as project root)
5. Verify each skill in `skills` exists as `<targetDir>/<skillName>/SKILL.md`
6. Return success with the installed version string (caller will write it back to manifest)

**Signature:** `pullGenerateSource(source: GenerateSource, targetDir: string, manifestDir: string): { generated: number; version: string } | { skipped: true } | { error: string }`

**Important security note:** The `command` field comes from the manifest which is a user-authored file (not untrusted web input). Use `execFileSync` with the command split into program and args array — do NOT pass through a shell via `execSync`.

**Step 1: Implement `pullGenerateSource`**

Write the function following the flow above. For command splitting: split `source.command` on whitespace, first element is the program, rest are args.

**Step 2: Commit**

```
feat: implement pullGenerateSource for CLI-generated skills
```

---

### Task 4: Wire Generate Sources into `main()`

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts` (Main section, lines 256-328)

**Step 1: Add generate source handling to the main loop**

Replace the placeholder from Task 1. In the `for (const source of manifest.sources)` loop, branch on `isGenerateSource(source)`:

- **Repo sources**: existing logic (unchanged)
- **Generate sources**: call `pullGenerateSource`, handle the three result types:
  - `skipped`: print "up to date" message
  - `error`: add to errors array
  - `generated`: add to totals, collect `{ sourceIndex, version }` for manifest update

**Step 2: Skip `gh auth` check when no repo sources exist**

The `gh auth status` check at the top of `main()` should only run if there are repo sources. Generate-only manifests don't need GitHub auth.

**Step 3: Commit**

```
feat: wire generate sources into pull-skills main loop
```

---

### Task 5: Write Back `installedVersion` to Manifest

**Files:**
- Modify: `.claude/skills/pull-skills/pull-skills.ts` (Main section)

After processing all sources, if any generate sources were successfully run, write the updated `installedVersion` values back to the manifest file.

**Step 1: Implement manifest write-back**

After the main loop completes:
1. Re-read the manifest file as raw JSON (to preserve formatting/comments)
2. For each successfully generated source, update the `installedVersion` field in the parsed JSON
3. Write the file back with `JSON.stringify(parsed, null, 2)` + newline

Use the `manifestPath` already available in scope. Only write if at least one generate source was updated.

**Step 2: Add a log line**

Print something like "Updated manifest with installed versions" when writing.

**Step 3: Commit**

```
feat: write back installedVersion to manifest after generation
```

---

### Task 6: Update `vision.md`

**Files:**
- Modify: `docs/vision/skill-management.md` (Skill Management section)

**Step 1: Update the manifest example**

Add a generate source to the example JSON (the OpenSpec source from the design doc). Update the "Sources fall into two categories" text to describe three categories: pure skill sources, tool-backed sources, and CLI-generated sources.

**Step 2: Replace "Command-to-Skill Conversion" section**

Replace lines 115-124 with a "CLI-Generated Sources" section that briefly describes the generate source type and how it works. Keep it concise — the design doc has the full details.

**Step 3: Update the "Two Skills: Discover and Pull" section**

Remove the bullet about "Normalizes commands to skill format" from the pull description. Add a bullet about running generate commands for CLI sources.

**Step 4: Commit**

```
docs: update vision.md with CLI-generated source type
```

---

### Task 7: End-to-End Verification

**Step 1: Create a test manifest with a generate source**

Create a temporary `skill-manifest.json` with a generate source that uses a simple command (e.g., a shell script or inline command that creates a skill directory). Verify pull-skills processes it correctly.

**Step 2: Verify repo sources still work**

Ensure a manifest with only repo sources still works as before (backward compat).

**Step 3: Verify skip behavior**

Run pull-skills twice with a generate source. Second run should skip with "up to date" message.

**Step 4: Verify `installedVersion` was written**

Check that the manifest file now contains the `installedVersion` field.

**Step 5: Clean up test artifacts**

Remove any temporary test manifests and generated files.

**Step 6: Commit (if any fixes were needed)**

```
fix: address issues found during e2e verification
```
