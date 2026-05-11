# Self-Review Checklist

After writing the complete plan, look at the spec with fresh eyes and run through each step below. This is a checklist you run yourself — fix issues inline as you find them.

---

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. PRD traceability (if PRD exists):** Verify every functional requirement (RF-XXX) from the PRD maps to at least one task. List any orphaned requirements. Verify that no task implements something listed in "Fora de Escopo."

**3. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section: "TBD", "TODO", "implement later", "fill in details", "add appropriate error handling", "write tests for the above" (without actual test code), "similar to Task N", steps that describe what to do without showing how (code blocks required for code steps), references to types/functions/methods not defined in any task.

**4. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**5. Task tracking artifacts:** Verify that:
- `tasks-<feature-name>.md` exists and lists every task (same count, same titles)
- Every task in the index has a corresponding `task-NN.md` file in the same `plans/` directory
- RF-XXX mappings in the index match those in the task files (if PRD exists)
- All checkboxes are `[ ]` (none pre-checked)
- Every task file has `**PRD:**` and `**Spec:**` fields with correct relative paths
- Paths in the index correctly point to existing task files

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.
