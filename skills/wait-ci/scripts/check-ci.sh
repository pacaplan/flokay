#!/usr/bin/env bash
# Single-invocation CI status check with short internal polling.
#
# Usage: ./check-ci.sh [--max-seconds N] [--interval S]
#
#   --max-seconds N   How long this invocation runs before exiting as "pending" (default: 90)
#   --interval S      Seconds between polls within this invocation (default: 10)
#
# Call this repeatedly from the skill to achieve a longer total wait time.
# Each call should have a Bash timeout: 120000 (2 minutes) to give headroom.
#
# Exit codes:
#   0 = terminal result — check "status" field for "passed" or "failed"
#   2 = not yet terminal — re-run to continue waiting
#   1 = fatal error
#
# JSON output fields:
#   status          "passed" | "failed" | "pending" | "no_checks"
#   pr_url          PR URL
#   pr_number       PR number
#   owner / repo    Repo coordinates for subsequent calls
#   had_checks      bool — whether any checks were seen on this invocation
#   checks          all checks from the last poll
#   failed_checks   checks with bucket == "fail"
#   passed_checks   checks with bucket == "pass"
#   pending_checks  checks still running
#   blocking_reviews reviews with CHANGES_REQUESTED (latest per reviewer)
#   failed_run_ids  GitHub Actions run IDs from failed check links

set -euo pipefail

MAX_SECONDS=90
INTERVAL=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-seconds)
      [[ $# -ge 2 ]] || { echo "Error: --max-seconds requires a value" >&2; exit 1; }
      MAX_SECONDS="$2"; shift 2 ;;
    --interval)
      [[ $# -ge 2 ]] || { echo "Error: --interval requires a value" >&2; exit 1; }
      INTERVAL="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if ! [[ "$MAX_SECONDS" =~ ^[0-9]+$ ]] || [[ "$MAX_SECONDS" -lt 1 ]]; then
  echo "Error: --max-seconds must be a positive integer" >&2; exit 1
fi
if ! [[ "$INTERVAL" =~ ^[0-9]+$ ]] || [[ "$INTERVAL" -lt 1 ]]; then
  echo "Error: --interval must be a positive integer (seconds)" >&2; exit 1
fi

MAX_POLLS=$(( (MAX_SECONDS + INTERVAL - 1) / INTERVAL ))
[[ $MAX_POLLS -lt 1 ]] && MAX_POLLS=1

# ── Find PR ───────────────────────────────────────────────────────────────────
pr_json=$(gh pr view --json number,url,headRefName 2>/dev/null) || {
  echo '{"error":"no PR found for current branch"}' >&2
  exit 1
}
pr_number=$(echo "$pr_json" | jq '.number')
pr_url=$(echo "$pr_json" | jq -r '.url')

# ── Repo info ─────────────────────────────────────────────────────────────────
repo_json=$(gh repo view --json owner,name 2>/dev/null) || {
  echo '{"error":"failed to fetch repo info"}' >&2
  exit 1
}
owner=$(echo "$repo_json" | jq -r '.owner.login')
repo=$(echo "$repo_json" | jq -r '.name')

poll=0
had_checks=false
checks_json='[]'
pending_checks='[]'

while [[ $poll -lt $MAX_POLLS ]]; do
  poll=$((poll + 1))

  # ── Fetch checks ──────────────────────────────────────────────────────────────
  # gh pr checks exits 1 with "no checks reported" for a valid empty state.
  _gh_err=$(mktemp)
  if ! checks_json=$(gh pr checks --json name,state,bucket,link 2>"$_gh_err"); then
    _err_msg=$(cat "$_gh_err"); rm -f "$_gh_err"
    if [[ "$_err_msg" == *"no checks reported"* ]]; then
      checks_json='[]'
    else
      jq -n --arg error "failed to fetch PR checks: $_err_msg" '{error: $error}' >&2
      exit 1
    fi
  else
    rm -f "$_gh_err"
  fi

  # ── Fetch reviews ─────────────────────────────────────────────────────────────
  if ! reviews_json=$(gh api --paginate "repos/${owner}/${repo}/pulls/${pr_number}/reviews?per_page=100" 2>/dev/null | jq -s 'add'); then
    jq -n --arg error "failed to fetch PR reviews" '{error: $error}' >&2
    exit 1
  fi

  # ── Classify checks ───────────────────────────────────────────────────────────
  pending_checks=$(echo "$checks_json" | jq '[.[] | select((.bucket // .state) == "pending" or (.bucket // .state) == "in_progress" or (.bucket // .state) == "queued")]')
  failed_checks=$(echo "$checks_json" | jq '[.[] | select((.bucket // .state) == "fail" or (.bucket // .state) == "failure")]')
  passed_checks=$(echo "$checks_json" | jq '[.[] | select((.bucket // .state) == "pass" or (.bucket // .state) == "success")]')

  total_checks=$(echo "$checks_json" | jq 'length')
  failed_count=$(echo "$failed_checks" | jq 'length')
  pending_count=$(echo "$pending_checks" | jq 'length')
  passed_count=$(echo "$passed_checks" | jq 'length')

  [[ $total_checks -gt 0 ]] && had_checks=true

  # ── Classify reviews ──────────────────────────────────────────────────────────
  blocking_reviews=$(echo "$reviews_json" | jq '
    reduce .[] as $r ({};
      if $r.state != "PENDING" then
        .[$r.user.login] = {login: $r.user.login, state: $r.state, body: $r.body}
      else . end
    ) | [to_entries[] | .value | select(.state == "CHANGES_REQUESTED")]
  ')
  blocking_count=$(echo "$blocking_reviews" | jq 'length')

  # ── Extract GitHub Actions run IDs ───────────────────────────────────────────
  failed_run_ids_json=$(echo "$failed_checks" | jq '
    [
      .[]
      | (.link // "")
      | (try capture("/actions/runs/(?P<id>[0-9]+)/").id)
      | select(. != null and . != "")
    ]
    | unique
  ')

  # ── Terminal: failure ─────────────────────────────────────────────────────────
  if [[ $failed_count -gt 0 || $blocking_count -gt 0 ]]; then
    jq -n \
      --arg     status           "failed" \
      --arg     pr_url           "$pr_url" \
      --argjson pr_number        "$pr_number" \
      --arg     owner            "$owner" \
      --arg     repo             "$repo" \
      --argjson had_checks       "$( [[ $had_checks == true ]] && echo true || echo false )" \
      --argjson checks           "$checks_json" \
      --argjson failed_checks    "$failed_checks" \
      --argjson passed_checks    "$passed_checks" \
      --argjson pending_checks   "$pending_checks" \
      --argjson blocking_reviews "$blocking_reviews" \
      --argjson failed_run_ids   "$failed_run_ids_json" \
      '{
        status: $status, pr_url: $pr_url, pr_number: $pr_number,
        owner: $owner, repo: $repo, had_checks: $had_checks,
        checks: $checks, failed_checks: $failed_checks,
        passed_checks: $passed_checks, pending_checks: $pending_checks,
        blocking_reviews: $blocking_reviews, failed_run_ids: $failed_run_ids
      }'
    exit 0
  fi

  # ── Terminal: passed ──────────────────────────────────────────────────────────
  if [[ $total_checks -gt 0 && $pending_count -eq 0 && $failed_count -eq 0 && $passed_count -eq $total_checks ]]; then
    jq -n \
      --arg     status          "passed" \
      --arg     pr_url          "$pr_url" \
      --argjson pr_number       "$pr_number" \
      --arg     owner           "$owner" \
      --arg     repo            "$repo" \
      --argjson had_checks      true \
      --argjson checks          "$checks_json" \
      --argjson passed_checks   "$passed_checks" \
      '{
        status: $status, pr_url: $pr_url, pr_number: $pr_number,
        owner: $owner, repo: $repo, had_checks: $had_checks,
        checks: $checks, failed_checks: [], passed_checks: $passed_checks,
        pending_checks: [], blocking_reviews: [], failed_run_ids: []
      }'
    exit 0
  fi

  # ── Not yet terminal — sleep and retry within this invocation ─────────────────
  if [[ $poll -lt $MAX_POLLS ]]; then
    sleep "$INTERVAL"
  fi
done

# ── This invocation timed out without a terminal result ───────────────────────
# Caller should re-invoke to continue waiting toward the total max_minutes limit.
jq -n \
  --arg     status          "$( [[ $had_checks == true ]] && echo "pending" || echo "no_checks" )" \
  --arg     pr_url          "$pr_url" \
  --argjson pr_number       "$pr_number" \
  --arg     owner           "$owner" \
  --arg     repo            "$repo" \
  --argjson had_checks      "$( [[ $had_checks == true ]] && echo true || echo false )" \
  --argjson checks          "$checks_json" \
  --argjson pending_checks  "$pending_checks" \
  '{
    status: $status, pr_url: $pr_url, pr_number: $pr_number,
    owner: $owner, repo: $repo, had_checks: $had_checks,
    checks: $checks, failed_checks: [], passed_checks: [],
    pending_checks: $pending_checks, blocking_reviews: [], failed_run_ids: []
  }'
exit 2
