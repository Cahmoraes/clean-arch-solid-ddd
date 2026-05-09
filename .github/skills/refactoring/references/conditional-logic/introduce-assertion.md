# Introduce Assertion

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when code assumes a condition is always true but leaves that assumption implicit.
Fowler adds assertions to document program state and to flag programmer errors the moment they appear.

## Code Smells Addressed
- Hidden assumptions about valid state.

- Invariants that only exist in comments or in a reader's head.

## Example

### Before
```typescript
class Customer {
  private _discountRate: number | null = null;

  get discountRate() {
    return this._discountRate;
  }

  applyDiscount(amount: number) {
    return this.discountRate
      ? amount - this.discountRate * amount
      : amount;
  }
}
```

### After
```typescript
import assert from "node:assert";

class Customer {
  private _discountRate: number | null = null;

  get discountRate() {
    return this._discountRate;
  }

  set discountRate(value: number | null) {
    assert(value === null || value >= 0);
    this._discountRate = value;
  }

  applyDiscount(amount: number) {
    if (!this.discountRate) return amount;
    return amount - this.discountRate * amount;
  }
}
```

## Mechanics
1. When you see that a condition is assumed to be true, add an assertion to state it.

## Notes
- Fowler says adding an assertion preserves behavior because the program should already rely on that condition being true.

- Other parts of the system should never catch or depend on assertion failures.

- He first rewrites a ternary into an `if` so he has a clean place to insert the assertion.

- He prefers placing the assertion where the invalid state enters the system, such as a setter, instead of only where the value is consumed.

- Assertions document assumptions for readers even after the immediate bug is gone.

- Some environments let you disable assertions, so the code must still function correctly without them.

- Do not use assertions for routine validation of external input; use normal program logic for that.

- Overuse hurts clarity, especially when the same condition appears in many places.

- Fowler recommends Extract Function to remove duplicated assertion logic.

## Related Refactorings
- Extract Function.
- Replace Derived Variable with Query.
- Split Variable.
