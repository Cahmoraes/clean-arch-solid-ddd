# Decompose Conditional

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a conditional tells you what happens but hides why it happens.
Fowler extracts the condition and both branches so the names explain the decision.

## Code Smells Addressed
- Complex condition checks that bury intent.

- Long conditional blocks that make a function harder to read.

## Example

### Before
```typescript
function chargeFor(plan: {
  summerStart: Date;
  summerEnd: Date;
  summerRate: number;
  regularRate: number;
  regularServiceCharge: number;
}, aDate: Date, quantity: number) {
  if (aDate >= plan.summerStart && aDate <= plan.summerEnd) {
    return quantity * plan.summerRate;
  }
  return quantity * plan.regularRate + plan.regularServiceCharge;
}
```

### After
```typescript
function chargeFor(plan: {
  summerStart: Date;
  summerEnd: Date;
  summerRate: number;
  regularRate: number;
  regularServiceCharge: number;
}, aDate: Date, quantity: number) {
  return summer() ? summerCharge() : regularCharge();

  function summer() {
    return aDate >= plan.summerStart && aDate <= plan.summerEnd;
  }

  function summerCharge() {
    return quantity * plan.summerRate;
  }

  function regularCharge() {
    return quantity * plan.regularRate + plan.regularServiceCharge;
  }
}
```

## Mechanics
1. Apply Extract Function on the condition and each leg of the conditional.

## Notes
- Fowler presents this as a focused use of Extract Function rather than a wholly different move.

- He extracts the condition first, then the `then` leg, then the `else` leg.

- Good names shift the code from what it does to why it does it.

- The original problem is usually not only length; it is that the condition and branches hide the reason for the choice.

- The refactoring works especially well when both the predicate and the resulting actions have meaningful domain names.

- Fowler calls out this case because he repeatedly finds strong value in the exercise.

- The extracted condition highlights what you are branching on, while the extracted branches explain why each path exists.

- After extraction, Fowler often prefers the conditional expression form because the helpers now carry the explanation.

## Related Refactorings
- Extract Function.
- Consolidate Conditional Expression.
- Replace Nested Conditional with Guard Clauses.
