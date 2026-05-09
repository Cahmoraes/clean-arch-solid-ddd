# Extract Variable

**Formerly:** Introduce Explaining Variable | **Inverse of:** Inline Variable

## When to Use
Use this refactoring when part of an expression needs a name of its own.
It helps when a calculation is hard to read, when you want to surface intent, or when you need a stable step while debugging.

## Code Smells Addressed
- Complicated expression
- Temporary value hidden inside a long formula

## Example

### Before
```typescript
function price(order: Order) {
  return (
    order.quantity * order.itemPrice -
    Math.max(0, order.quantity - 500) * order.itemPrice * 0.05 +
    Math.min(order.quantity * order.itemPrice * 0.1, 100)
  )
}

type Order = {
  quantity: number
  itemPrice: number
}

const sampleOrder = { quantity: 600, itemPrice: 2 }
console.log(price(sampleOrder))
```

### After
```typescript
function price(order: Order) {
  const basePrice = order.quantity * order.itemPrice
  const quantityDiscount =
    Math.max(0, order.quantity - 500) * order.itemPrice * 0.05
  const shipping = Math.min(basePrice * 0.1, 100)

  return basePrice - quantityDiscount + shipping
}

type Order = {
  quantity: number
  itemPrice: number
}

const sampleOrder = { quantity: 600, itemPrice: 2 }
console.log(price(sampleOrder))
```

## Mechanics
1. Make sure the expression you want to name has no side effects.
   Fowler extracts only calculations that can be evaluated safely.
2. Declare an immutable variable for the expression.
   Put the copied expression on the right-hand side.
3. Replace the original expression with the new variable.
   Keep the surrounding expression unchanged.
4. Test.
   The result should stay exactly the same.
5. If the same expression appears elsewhere, replace each occurrence with the variable.
   Test after each replacement when you do it in several places.

## Notes
- Fowler prefers Extract Function when the named value should live in a wider scope.
- In a class, a query method can be better than a local variable because it is easier to move later.
- Good variable names should describe the meaning of the subexpression, not restate the formula.
- This refactoring often makes later changes safer because each part has a stable name.
- It works best with immutable bindings so the name always means one thing.
- The book presents this as a readability refactoring first and a debugging aid second.
- Use it repeatedly on one expression when a formula contains several distinct concepts.
- Extract Variable can expose domain terms that were buried in arithmetic.
- Fowler often follows it with Extract Function when the named part matters elsewhere.

## Related Refactorings
- Inline Variable
- Extract Function
- Split Variable
- Replace Temp with Query
