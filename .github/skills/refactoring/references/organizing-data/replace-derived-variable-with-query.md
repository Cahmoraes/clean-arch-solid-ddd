# Replace Derived Variable with Query

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a field or variable duplicates a value you can calculate from other data.
Fowler uses it to reduce mutable state and to prevent derived data from drifting out of sync.

## Code Smells Addressed
- Duplicated data stored alongside its source.

- Derived state that can go stale after an update.

## Example

### Before
```typescript
class ProductionPlan {
  private _adjustments: Array<{ amount: number }> = [];
  private _production = 0;

  get production() {
    return this._production;
  }

  applyAdjustment(adjustment: { amount: number }) {
    this._adjustments.push(adjustment);
    this._production += adjustment.amount;
  }
}
```

### After
```typescript
class ProductionPlan {
  private _adjustments: Array<{ amount: number }> = [];

  get production() {
    return this._adjustments.reduce((sum, adjustment) => {
      return sum + adjustment.amount;
    }, 0);
  }

  applyAdjustment(adjustment: { amount: number }) {
    this._adjustments.push(adjustment);
  }
}
```

## Mechanics
1. Identify all points of update for the variable. If necessary, use Split Variable to separate each point of update.

2. Create a function that calculates the value of the variable.

3. Use Introduce Assertion to assert that the variable and the calculation give the same result whenever the variable is used.

4. If necessary, use Encapsulate Variable to provide a home for the assertion.

5. Test.

6. Replace any reader of the variable with a call to the new function.

7. Test.

8. Apply Remove Dead Code to the declaration and updates to the variable.

## Notes
- Fowler treats the assertion as a hypothesis test: it proves that the derived calculation matches the stored value before removal.

- If more than one source contributes to the stored value, split the sources first and only then replace the derived part.

- In the second example, he separates `_initialProduction` from the accumulated adjustments before removing the derived accumulator.

- He notes an exception: if the source data is immutable and the derived result is also immutable, keeping transformed data may still be reasonable.

- After the refactoring, you may inline the query, but Fowler also notes that a named query can stay if it helps understanding.

## Related Refactorings
- Split Variable.
- Introduce Assertion.
- Encapsulate Variable.
- Remove Dead Code.
- Inline Function.
