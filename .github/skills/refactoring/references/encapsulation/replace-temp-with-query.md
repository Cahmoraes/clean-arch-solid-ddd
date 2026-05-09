# Replace Temp with Query

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a temporary variable holds the result of a calculation that you can extract as a query method.
It removes a blocker to **Extract Function** and makes long functions easier to decompose.

## Code Smells Addressed
- Long function
- Temporary variables that block extraction

## Example

### Before
```typescript
class Order {
  constructor(
    private readonly _quantity: number,
    private readonly _itemPrice: number
  ) {}

  get price() {
    const basePrice = this._quantity * this._itemPrice
    let discountFactor = 0.98

    if (basePrice > 1000) {
      discountFactor = 0.95
    }

    return basePrice * discountFactor
  }
}

const order = new Order(12, 100)
console.log(order.price)
```

### After
```typescript
class Order {
  constructor(
    private readonly _quantity: number,
    private readonly _itemPrice: number
  ) {}

  get price() {
    return this.basePrice * this.discountFactor
  }

  private get basePrice() {
    return this._quantity * this._itemPrice
  }

  private get discountFactor() {
    if (this.basePrice > 1000) {
      return 0.95
    }

    return 0.98
  }
}

const order = new Order(12, 100)
console.log(order.price)
```

## Mechanics
1. Check that the temporary is fully computed before any use and always yields the same result.
2. If the variable is not already immutable, make it immutable and test.
3. Extract the right-hand side of the assignment into a function or query method with **Extract Function**.
4. Make sure the extracted function has no side effects. If it does, use **Separate Query from Modifier** first.
5. Test.
6. Inline the temporary with **Inline Variable** so callers use the new query directly.

## Notes
- This works best inside a class because the new query can read object state without growing a long parameter list.
- Do not apply it to a snapshot variable whose purpose is to preserve an old value over time.
- The point is not to ban temporaries. The point is to remove the ones that make later refactorings harder.
- Each extracted query creates a name for an idea in the domain.
- This refactoring often repeats several times in the same function until the main method reads clearly.

## Related Refactorings
- Extract Function
- Inline Variable
- Separate Query from Modifier
- Extract Class
