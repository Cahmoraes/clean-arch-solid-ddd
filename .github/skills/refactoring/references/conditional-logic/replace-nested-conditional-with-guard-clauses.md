# Replace Nested Conditional with Guard Clauses

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when one branch represents an unusual case and the main path should stay flat.
Fowler uses guard clauses to say, in effect, “handle this case and get out.”

## Code Smells Addressed
- Deeply nested conditionals that hide the main path.

- Exceptional cases given the same visual weight as normal behavior.

## Example

### Before
```typescript
function payAmount(employee: {
  isSeparated: boolean;
  isRetired: boolean;
}) {
  let result;
  if (employee.isSeparated) {
    result = { amount: 0, reasonCode: "SEP" };
  } else {
    if (employee.isRetired) {
      result = { amount: 0, reasonCode: "RET" };
    } else {
      result = { amount: 100, reasonCode: "OK" };
    }
  }
  return result;
}
```

### After
```typescript
function payAmount(employee: {
  isSeparated: boolean;
  isRetired: boolean;
}) {
  if (employee.isSeparated) {
    return { amount: 0, reasonCode: "SEP" };
  }

  if (employee.isRetired) {
    return { amount: 0, reasonCode: "RET" };
  }

  return { amount: 100, reasonCode: "OK" };
}
```

## Mechanics
1. Select the outermost condition that needs to be replaced, and change it into a guard clause.

2. Test.

3. Repeat as needed.

4. If all the guard clauses return the same result, use Consolidate Conditional Expression.

## Notes
- Fowler distinguishes this case from a normal `if/else`, where both branches represent ordinary behavior.

- A nested `if/else` gives equal visual weight to every branch; a guard clause deliberately does not.

- Fowler rejects the blanket rule that a method should have only one exit point.

- Clarity decides whether multiple returns help.

- When you turn a nested condition into a guard clause, you often reverse the condition.

- In the book's second example, he changes `capital > 0` into the guard `capital <= 0`.

- Guard clauses often make a result accumulator unnecessary, which lets you remove a mutable local variable.

## Related Refactorings
- Consolidate Conditional Expression.
- Decompose Conditional.
