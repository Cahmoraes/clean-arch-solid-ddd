# Copilot CLI Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | Copilot CLI equivalent |
|-----------------|----------------------|
| `Read` (file reading) | `view` |
| `Write` (file creation) | `create` |
| `Edit` (file editing) | `edit` |
| `Bash` (run commands) | `bash` |
| `Grep` (search file content) | `grep` |
| `Glob` (search files by name) | `glob` ⚠️ see limitation below |
| `Skill` tool (invoke a skill) | `skill` |
| `WebFetch` | `web_fetch` |
| `Task` tool (dispatch subagent) | `task` with `agent_type: "general-purpose"` or `"explore"` |
| Multiple `Task` calls (parallel) | Multiple `task` calls |
| Task status/output | `read_agent`, `list_agents` |
| `TodoWrite` (task tracking) | `sql` with built-in `todos` table |
| `WebSearch` | No equivalent — use `web_fetch` with a search engine URL |
| `EnterPlanMode` / `ExitPlanMode` | No equivalent — stay in the main session. Do not fall back to the platform's native plan mode; use `brainstorming` -> `generating-prd` -> `writing-plans`. |

## ⚠️ Known Limitation: `glob` and Hidden Directories

The `glob` tool **does not return files inside hidden directories** (directories whose names start with `.`). This affects `.superpowers/`, `.github/`, `.config/`, and any other dotdir.

**Preferred method — use the deterministic script:**

```bash
# Your skill context header shows the base directory — use it to build the absolute path:
node <using-superpowers-base-dir>/scripts/read-preferences.cjs --repo-root "$(git rev-parse --show-toplevel)"
```

The script uses `git rev-parse --show-toplevel` for root detection, handles nested YAML correctly, returns defaults for missing keys, and marks malformed files. See `scripts/read-preferences.cjs --help` for the full JSON output schema.

**Fallback — use `view` directly (NOT `glob`):**

```
view("/path/to/repo/.superpowers/preferences.yml")
```

A successful read means the file exists. An error or "path does not exist" means it is absent. As an alternative:

```bash
test -f .superpowers/preferences.yml && echo exists || echo not-found
```

Never use `glob` to detect files in hidden directories.

## Async shell sessions

Copilot CLI supports persistent async shell sessions, which have no direct Claude Code equivalent:

| Tool | Purpose |
|------|---------|
| `bash` with `async: true` | Start a long-running command in the background |
| `write_bash` | Send input to a running async session |
| `read_bash` | Read output from an async session |
| `stop_bash` | Terminate an async session |
| `list_bash` | List all active shell sessions |

## Additional Copilot CLI tools

| Tool | Purpose |
|------|---------|
| `store_memory` | Persist facts about the codebase for future sessions |
| `report_intent` | Update the UI status line with current intent |
| `sql` | Query the session's SQLite database (todos, metadata) |
| `fetch_copilot_cli_documentation` | Look up Copilot CLI documentation |
| GitHub MCP tools (`github-mcp-server-*`) | Native GitHub API access (issues, PRs, code search) |

---

## Rubber Duck Agent (Experimental)

**Rubber Duck** is a review agent exclusive to Copilot CLI, available in experimental mode. It uses a model from a different family than the orchestrator — when the orchestrator is Claude, Rubber Duck is GPT-5.4. This means independent perspectives with distinct blind spots, catching errors that self-review would miss.

To enable experimental mode: run `/experimental` in Copilot CLI.

### When to invoke (forced checkpoints)

When `copilot.rubber_duck: true` in `.superpowers/preferences.yml`, **always** invoke Rubber Duck at these moments (do not skip):

| Checkpoint | Moment in superpowers flow | Why |
|-----------|---------------------------|-----|
| **After drafting the plan** | `writing-plans` / `brainstorming` complete | Design decisions are cheap to fix on paper; mistakes here multiply through implementation |
| **After a complex implementation** | `subagent-driven-development` finishes a task with 3+ files modified | A second perspective catches edge cases and cross-file conflicts that the primary agent misses while immersed in context |
| **After writing tests** | `test-driven-development` writes tests, before running them | Identifies coverage gaps and flawed assertions before the agent self-confirms with "everything passed" |

Rubber Duck can also be invoked **reactively** when `systematic-debugging` loops without progress — an external perspective can break the deadlock.

The user may request a review at any time — comply and incorporate the feedback.

### How to invoke

Use the `task` tool with `agent_type: "rubber-duck"`:

```
task(
  name: "rubber-duck-review",
  agent_type: "rubber-duck",
  description: "Second opinion on [plan / implementation / tests]",
  prompt: "<full context: what was done, what decisions were made, what needs review>",
  mode: "sync"
)
```

After receiving feedback: reason over each point, adopt findings that prevent real bugs, and show the user what changed and why.

### Check preference before invoking

```
1. Read .superpowers/preferences.yml
2. If copilot.rubber_duck == true → force invoke at all checkpoints below
3. If copilot.rubber_duck == false or key absent → Copilot CLI default behavior (it decides when to invoke)
```

### During Onboarding

When running the `references/onboarding-preferences.md` wizard, include the additional Rubber Duck step as documented in the "Copilot CLI: Rubber Duck Additional Step" section of that file.
