# Rename Variable

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a variable name no longer matches what it means.
It helps because better names improve understanding immediately, especially for variables with broad scope or long life.

## Code Smells Addressed
- Mysterious name
- Misleading temporary or field name

## Example

### Before
```typescript
let tpHd = "untitled"

function renderTitle() {
  return `<h1>${tpHd}</h1>`
}

function updateTitle(newTitle: string) {
  tpHd = newTitle.trim()
}

updateTitle("Refactoring")
console.log(renderTitle())
```

### After
```typescript
let title = "untitled"

function renderTitle() {
  return `<h1>${title}</h1>`
}

function updateTitle(newTitle: string) {
  title = newTitle.trim()
}

updateTitle("Refactoring")
console.log(renderTitle())
```

## Mechanics
1. If the variable is used widely, consider Encapsulate Variable first.
   A narrow access point makes renaming much safer.
2. Find every reference to the variable and change each one.
   The change is trivial when the variable is local.
3. If code in another codebase refers to the variable, treat it as published.
   Fowler does not refactor published variables directly.
4. If the variable is immutable, you can introduce the new name alongside the old one.
   Then switch references gradually.
5. Test.
   Confirm that all references point to the new name and the old one is gone.

## Notes
- Fowler stresses that naming is central, not cosmetic.
- The wider the scope, the more value you get from a better name.
- Local variables are usually easy to rename with IDE support.
- Shared or exported variables need more care because callers may live elsewhere.
- Encapsulating first can turn a risky rename into a routine one.
- Constants are good candidates for a staged rename because they do not change after assignment.
- Rename Variable is often the first small step toward understanding unfamiliar code.
- When the old name suggests the wrong concept, fix it before more callers appear.
- The book treats broad scope and persistence as reasons to be more deliberate.
- If several names clash, change the one that most damages understanding first.
- Renaming a field or parameter can improve every call site at once.
- Fowler treats a good rename as a design improvement, not cosmetic cleanup.
- A staged rename can be useful when tools or publication boundaries prevent one-shot changes.
- Better names make later refactorings easier because intent is already visible.
- Rename the variable that most impedes understanding first when you cannot rename everything.

## Related Refactorings
- Encapsulate Variable
- Change Function Declaration
- Extract Variable
- Inline Variable
