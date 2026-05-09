# Consolidate Conditional Expression

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when several different checks all lead to the same action.
Fowler combines them to show one decision, not a sequence of unrelated decisions.

## Code Smells Addressed
- Repeated conditional branches with the same result.

- Decision logic scattered across separate `if` statements.

## Example

### Before
```typescript
function disabilityAmount(employee: {
  seniority: number;
  monthsDisabled: number;
  isPartTime: boolean;
}) {
  if (employee.seniority < 2) return 0;
  if (employee.monthsDisabled > 12) return 0;
  if (employee.isPartTime) return 0;
  return 1;
}
```

### After
```typescript
function disabilityAmount(employee: {
  seniority: number;
  monthsDisabled: number;
  isPartTime: boolean;
}) {
  if (isNotEligibleForDisability()) return 0;
  return 1;

  function isNotEligibleForDisability() {
    return (
      employee.seniority < 2 ||
      employee.monthsDisabled > 12 ||
      employee.isPartTime
    );
  }
}
```

## Mechanics
1. Ensure that none of the conditionals have any side effects.

2. If any do, use Separate Query from Modifier on them first.

3. Take two of the conditional statements and combine their conditions using a logical operator.

4. Use `or` for sequences and `and` for nested `if` statements.

5. Test.

6. Repeat until they all appear in a single condition.

7. Consider using Extract Function on the resulting condition.

## Notes
- Fowler does not consolidate checks that are truly independent and should stay separate in the reader's mind.

- He consolidates because a run of separate checks can look like several unrelated decisions that only happen to sit together.

- A sequence of early returns usually combines with `||`.

- Nested checks that must both pass usually combine with `&&`.

- Mixed boolean logic can become messy quickly, so he recommends Extract Function liberally.

- The extraction matters because it replaces a statement of what you check with why you check it.

## Related Refactorings
- Separate Query from Modifier.
- Extract Function.
- Replace Nested Conditional with Guard Clauses.
