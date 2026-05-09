# Inline Variable

**Formerly:** Inline Temp | **Inverse of:** Extract Variable

## When to Use
Use this refactoring when a variable adds no meaning beyond the expression it holds.
It helps clear away names that do not explain anything and removes variables that get in the way of other refactorings.

## Code Smells Addressed
- Unnecessary temporary variable
- Poor variable name

## Example

### Before
```typescript
function hasDiscount(order: Order) {
  const basePrice = order.quantity * order.itemPrice

  return basePrice > 1000
}

type Order = {
  quantity: number
  itemPrice: number
}

const smallOrder = { quantity: 5, itemPrice: 10 }
const largeOrder = { quantity: 100, itemPrice: 15 }

console.log(hasDiscount(smallOrder))
console.log(hasDiscount(largeOrder))
```

### After
```typescript
function hasDiscount(order: Order) {
  return order.quantity * order.itemPrice > 1000
}

type Order = {
  quantity: number
  itemPrice: number
}

const smallOrder = { quantity: 5, itemPrice: 10 }
const largeOrder = { quantity: 100, itemPrice: 15 }

console.log(hasDiscount(smallOrder))
console.log(hasDiscount(largeOrder))
```

## Mechanics
1. Verify that the expression on the right-hand side has no side effects.
   Fowler only inlines safe expressions.
2. If the variable is not already immutable, make it immutable and test.
   That confirms the variable is assigned only once.
3. Find the first reference to the variable and replace it with the right-hand expression.
   Preserve parentheses if they are needed for meaning.
4. Test.
   A quick check after the first substitution catches mistakes early.
5. Repeat until every reference has been replaced.
   Work through the references one at a time.
6. Remove the declaration and assignment.
   The variable is dead once nothing refers to it.
7. Test again.
   This final check confirms the cleanup is complete.

## Notes
- Fowler uses this when the variable name is no clearer than the original expression.
- Inline Variable is often a setup for Extract Function on a larger, cleaner fragment.
- If the variable protects you from repeating a costly or side-effecting expression, keep it.
- This refactoring is easiest when the variable has one assignment and a tight scope.
- It is common to inline a variable right after discovering that its name is misleading.
- Removing the variable can reveal a better place to extract a more meaningful name.
- The book treats this as a simple but useful cleanup.

## Related Refactorings
- Extract Variable
- Extract Function
- Split Variable
- Change Function Declaration
