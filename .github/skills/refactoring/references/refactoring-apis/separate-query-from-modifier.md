# Separate Query from Modifier

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when one function both returns a value and causes an
observable side effect.
Split it so the query stays safe to call, move, and test without worrying
about hidden behavior.

## Code Smells Addressed
- A value-returning function that also changes observable state.

- A caller that cannot use a result without also triggering a side effect.

## Example

### Before
```typescript
function alertForMiscreant(people: string[]) {
  for (const person of people) {
    if (person === "Don") {
      setOffAlarms();
      return "Don";
    }

    if (person === "John") {
      setOffAlarms();
      return "John";
    }
  }

  return "";
}
```

### After
```typescript
function findMiscreant(people: string[]) {
  for (const person of people) {
    if (person === "Don") return "Don";
    if (person === "John") return "John";
  }

  return "";
}

function alertForMiscreant(people: string[]) {
  if (findMiscreant(people) !== "") setOffAlarms();
}
```

## Mechanics
1. Copy the function and give the copy a query name.

2. Inspect what the function returns so the new name fits that result.

3. Remove side effects from the new query function.

4. Run static checks.

5. For each call to the original function, if the caller uses the return
   value, replace that call with the query and add a call to the original
   function below it. Test after each change.

6. Remove the return value from the original modifier function.

7. Test.

## Notes
- Fowler draws the line at observable side effects. Internal caching is fine
  if callers cannot observe a difference in results.

- This refactoring follows command-query separation as a rule of thumb,
  not as an absolute law.

- Expect duplication right after the split. The query and modifier often
  share logic for a short time.

- In the book example, the last cleanup is to let the modifier call the
  query and then raise the alarm.

## Related Refactorings
- Substitute Algorithm

- Change Function Declaration
