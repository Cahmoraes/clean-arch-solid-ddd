# Replace Parameter with Query

**Formerly:** Replace Parameter with Method | **Inverse of:** Replace Query with Parameter

## When to Use
Use this refactoring when a caller passes a value that the function can
determine just as easily on its own.
Remove the duplicate input so callers do less work and the signature shows
only real points of variation.

## Code Smells Addressed
- A parameter that duplicates information already available to the callee.

- An overlong signature that lists values derivable from other parameters.

## Example

### Before
```typescript
class Order {
  get finalPrice() {
    const basePrice = this.quantity * this.itemPrice;
    return this.discountedPrice(basePrice, this.discountLevel);
  }

  get discountLevel() {
    return this.quantity > 100 ? 2 : 1;
  }

  discountedPrice(basePrice: number, discountLevel: number) {
    switch (discountLevel) {
      case 1:
        return basePrice * 0.95;
      case 2:
        return basePrice * 0.9;
    }
  }
}
```

### After
```typescript
class Order {
  get finalPrice() {
    const basePrice = this.quantity * this.itemPrice;
    return this.discountedPrice(basePrice);
  }

  get discountLevel() {
    return this.quantity > 100 ? 2 : 1;
  }

  discountedPrice(basePrice: number) {
    switch (this.discountLevel) {
      case 1:
        return basePrice * 0.95;
      case 2:
        return basePrice * 0.9;
    }
  }
}
```

## Mechanics
1. If needed, extract the calculation that produces the parameter into its
   own query.

2. Replace references to the parameter inside the function body with the
   expression or query that yields that value. Test after each change.

3. Use Change Function Declaration to remove the parameter.

## Notes
- Fowler uses this most often after other refactorings make a parameter
  redundant.

- The safest case is when the removable parameter can be derived by querying
  another parameter that is already present.

- Do not do this if the query would add an unwanted dependency to the
  function body.

- Guard referential transparency. Do not replace a parameter with a lookup
  of mutable global state.

## Related Refactorings
- Replace Temp with Query

- Change Function Declaration
