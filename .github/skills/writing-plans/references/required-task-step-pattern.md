# Required Task Step Pattern

Every `## Passos` section in a task file MUST follow this TDD pattern exactly. Do not summarize or abbreviate — copy the structure below and fill it with real code, real commands, and real expected outputs.

## Pattern

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Rules

- Every step is one action (2–5 minutes max).
- Steps that involve code **must** include the actual code block — never describe what the code should do without showing it.
- Run commands must include the exact command and the expected output.
- Never use "TBD", "TODO", "similar to Task N", or vague phrases like "add error handling."
- Repeat code across tasks if needed — engineers may read tasks out of order.
