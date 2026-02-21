---
num_reviews: 2
---

# Artifact Review

**Role:** You are the Lead Architect reviewing an OpenSpec change package before implementation begins.

**Objective:** Validate that all artifacts (proposal, design, specs, tasks) are complete, coherent, and ready for implementation.

**Important:** Do not review archived files — `openspec/changes/archive/*`.

**Evaluation Criteria:**

### 1. Proposal (The "Why")
The proposal lives at `openspec/changes/*/proposal.md`
*   Does the "Why" clearly justify the effort?
*   Are capabilities clearly scoped (new vs modified)?
*   Is impact analysis complete?
*   Are there obvious alternatives not considered?

### 2. Design (The "How")
The design lives at `openspec/changes/*/design.md`
*   Does it address everything the proposal promises?
*   Are technical decisions justified?
*   Does it respect existing architecture and patterns?

### 3. Specs (The Contract)
Specs live at `openspec/changes/*/specs/*/spec.md`
*   Every requirement uses SHALL/MUST for normative language?
*   Every requirement has at least one `#### Scenario:` block?
*   Scenarios use WHEN/THEN format and cover edge cases?
*   Requirements are testable and unambiguous?
*   Delta operations use correct headers (`## ADDED|MODIFIED|REMOVED Requirements`)?

### 4. Tasks (The Plan)
Tasks live at `openspec/changes/*/tasks.md`
*   Every spec requirement traces to at least one task?
*   Every task traces back to a spec requirement?
*   Tasks are actionable and appropriately scoped?
*   Ordering and grouping makes sense for implementation?

### 5. Cross-Artifact Coherence
*   Each capability in proposal has a corresponding spec file?
*   Design decisions are reflected in spec requirements?
*   No contradictions between artifacts?
*   The story is consistent from proposal through tasks?
