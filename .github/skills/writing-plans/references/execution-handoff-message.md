# Execution Handoff Message

After saving the tasks index and task files, offer this message to the user verbatim (fill in the feature name and task count):

---

**"Tasks created and saved to `docs/superpowers/<feature-name>/plans/`.**
**Task index: `tasks-<feature-name>.md` with N tasks.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per task + two-stage review
- Pass the tasks index path to the execution skill

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Batch execution with checkpoints
- Pass the tasks index path to the execution skill for review

**Which approach?"**
