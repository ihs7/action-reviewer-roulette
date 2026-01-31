# Copilot Instructions for Reviewer Roulette

## Project Overview

- **Purpose:** This is a GitHub Action that assigns a specified number of random
  reviewers to a pull request, selecting from recent active users in the
  repository.
- **Core Logic:**
  - Main logic is in `src/main.ts` (see `run()` function).
  - Entrypoint is `src/index.ts` (calls `run()`).
  - Tests are in `__tests__/main.test.ts`.
- **How reviewers are chosen:**
  - Fetches recent repository events to find active users (excluding bots, PR
    author, existing reviewers, and any in `excluded-reviewers`).
  - Randomly selects up to `number-of-reviewers` (but not exceeding
    `max-number-of-reviewers`).

## Developer Workflows

- **Build:** No explicit build step for the action logic (runs as-is in GitHub
  Actions). For local development, use TypeScript tooling as needed.
- **Test:**
  - Run all tests: `node --test`
- **Release:**
  - Use `script/release` for tagging and publishing. This script enforces
    versioning and tagging conventions for major/minor releases.
  - Always update `package.json` version before running the release script.

## Action Inputs (see `README.md` for full table)

- `token`: GitHub token (default: `GITHUB_TOKEN`)
- `pull-request-number`: PR number to assign reviewers to
- `number-of-reviewers`: How many reviewers to add (default: 1)
- `max-number-of-reviewers`: Max reviewers allowed on PR
- `excluded-reviewers`: Comma-separated list of usernames to exclude
- `dry-run`: If set, logs actions but does not add reviewers

## Patterns & Conventions

- **Code Quality:**
  - Code should be self-explanatory; avoid comments when possible.
- **Testing:**
  - Mocks GitHub API and action inputs extensively in `__tests__/main.test.ts`.
  - Tests cover error handling, dry-run, exclusion logic, and reviewer
    selection.
- **Logging:**
  - Uses `core.info`, `core.warning`, and `core.setFailed` for status and error
    reporting.
- **Randomness:**
  - Reviewer selection is randomized with
    `Array.sort(() => 0.5 - Math.random())`.
- **Exclusions:**
  - Excludes bots, PR author, existing reviewers, and any usernames in
    `excluded-reviewers`.
- **Permissions:**
  - Action requires `contents: read` and `pull-requests: write` permissions.

## Key Files

- `src/main.ts`: Main action logic
- `src/index.ts`: Entrypoint
- `__tests__/main.test.ts`: Test suite
- `script/release`: Release automation
- `README.md`: Usage, inputs, permissions

## Example Usage

See `README.md` for workflow YAML examples and input details.

---

**If you are an AI agent, follow these conventions and reference the above files
for implementation details.**
