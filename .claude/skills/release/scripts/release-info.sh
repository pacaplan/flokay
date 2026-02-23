#!/usr/bin/env bash
set -euo pipefail

# release-info.sh — Gather merged PRs, classify by type, calculate version bump.
# Output: JSON with current_version, new_version, and PRs grouped by bump type.

REPO="pacaplan/flokay"
PLUGIN_JSON=".claude-plugin/plugin.json"

# --- Ensure clean main branch ---
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  jq -n --arg branch "$CURRENT_BRANCH" '{"error": "not_on_main", "message": "Must be on main branch. Current branch: \($branch)"}' >&2
  exit 1
fi

git pull origin main --quiet
git fetch --tags --quiet

# --- Find last release tag ---
LAST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -1)
if [ -z "$LAST_TAG" ]; then
  TAG_DATE="1970-01-01T00:00:00Z"
else
  TAG_DATE=$(git log -1 --format=%cI "$LAST_TAG")
fi

# --- Current version from plugin.json ---
CURRENT_VERSION=$(jq -r '.version' "$PLUGIN_JSON")
if [[ ! "$CURRENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  jq -n --arg v "$CURRENT_VERSION" '{"error": "invalid_version", "message": "Invalid version in plugin.json: \($v)"}' >&2
  exit 1
fi

# --- Fetch merged PRs since last tag ---
PRS=$(gh pr list --repo "$REPO" --state merged --base main \
  --search "merged:>$TAG_DATE" \
  --json number,title,mergedAt,labels --limit 100)

# --- Filter out release PRs and classify ---
RESULT=$(echo "$PRS" | jq --arg cv "$CURRENT_VERSION" '
  # Filter out release PRs
  [.[] | select(
    (.title | test("^chore: (release|version packages)") | not) and
    (.title | test("^chore\\(release\\)") | not)
  )] |

  # Classify each PR
  {
    current_version: $cv,
    major: [.[] | select(
      (.title | test("^\\w+(\\(.*\\))?!:")) or
      (.labels // [] | map(.name) | any(. == "breaking"))
    )],
    minor: [.[] | select(
      (.title | test("^feat(\\(.*\\))?:")) and
      (.title | test("^\\w+(\\(.*\\))?!:") | not) and
      ((.labels // [] | map(.name) | any(. == "breaking")) | not)
    )],
    patch: [.[] | select(
      (.title | test("^feat(\\(.*\\))?:") | not) and
      (.title | test("^\\w+(\\(.*\\))?!:") | not) and
      ((.labels // [] | map(.name) | any(. == "breaking")) | not)
    )]
  } |

  # Check if anything to release
  if (.major | length) + (.minor | length) + (.patch | length) == 0 then
    {error: "nothing_to_release", message: "No qualifying merged PRs found since last release."}
  else
    # Calculate new version
    ($cv | split(".") | map(tonumber)) as [$maj, $min, $pat] |
    if (.major | length) > 0 then
      .new_version = "\($maj + 1).0.0"
    elif (.minor | length) > 0 then
      .new_version = "\($maj).\($min + 1).0"
    else
      .new_version = "\($maj).\($min).\($pat + 1)"
    end
  end
')

echo "$RESULT"
