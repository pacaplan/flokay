# AGENTS.md

## Plans describe WHAT, not HOW to code

Implementation plans should specify requirements, acceptance criteria, interfaces, and architectural decisions. They should NOT contain verbatim code for the implementer to copy-paste.

**Why:** When a plan dictates exact code, the implementer becomes a transcriber and the reviewer can only check "does it match the plan" instead of "is this good code." Real issues get waved through because "the plan said so."

**Good plan task:**
> Create a `ghApi` helper that wraps the `gh` CLI. It should accept an API endpoint string, call `gh api`, and return the response. Handle errors by wrapping them with the endpoint for context. Avoid shell injection — do not interpolate user-controlled strings into shell commands.

**Bad plan task:**
> Add this exact code:
> ```typescript
> function ghApi(endpoint: string): string {
>   return execSync(`gh api "${endpoint}"`, { ... }).trim();
> }
> ```

The bad version denies the implementer the chance to choose `execFileSync` over `execSync`, and the reviewer has no leverage to flag the shell injection because "the plan specified it."

## Reviewer feedback is authoritative over plans

When a reviewer identifies a real issue (security, correctness, maintainability), fix it — even if the plan's code had the same problem. The plan is a starting point, not a contract. Code quality standards don't get waived because a plan was followed faithfully.

## Implementer agents own the code

Implementer subagents should:
- Read the task requirements and write their own code
- Make their own decisions about naming, error handling, and structure
- Follow existing patterns in the codebase
- Apply security best practices (no shell injection, input validation, etc.)

They should NOT be given exact code to copy. Give them the *what* and let them figure out the *how*.
