# Inline Function

**Formerly:** Inline Method | **Inverse of:** Extract Function

## When to Use
Use this refactoring when a function body says the same thing as its name, or says it more clearly.
It helps remove needless indirection and can clear the way for a better round of extraction and reorganization.

## Code Smells Addressed
- Lazy function
- Unhelpful indirection

## Example

### Before
```typescript
function rating(driver: Driver) {
  return moreThanFiveLateDeliveries(driver) ? 2 : 1
}

function moreThanFiveLateDeliveries(driver: Driver) {
  return driver.numberOfLateDeliveries > 5
}

type Driver = {
  numberOfLateDeliveries: number
}

const regularDriver = { numberOfLateDeliveries: 3 }
const riskyDriver = { numberOfLateDeliveries: 8 }

console.log(rating(regularDriver))
console.log(rating(riskyDriver))
```

### After
```typescript
function rating(driver: Driver) {
  return driver.numberOfLateDeliveries > 5 ? 2 : 1
}

type Driver = {
  numberOfLateDeliveries: number
}

const regularDriver = { numberOfLateDeliveries: 3 }
const riskyDriver = { numberOfLateDeliveries: 8 }

console.log(rating(regularDriver))
console.log(rating(riskyDriver))
```

## Mechanics
1. Check that the function is not polymorphic.
   Fowler does not inline a method when subclasses may provide different behavior.
2. Find every call site for the function.
   You need the full set before you can remove the declaration safely.
3. Replace each call with the function body.
   Adapt arguments and local names as needed at the call site.
4. Test after each replacement, or after a small batch of replacements.
   Small steps keep the refactoring easy to back out.
5. Remove the old function declaration.
   Delete it only when no caller depends on it.

## Notes
- Fowler uses this when he wants to untangle a set of functions and then extract again on a cleaner surface.
- If inlining becomes awkward because of multiple returns, recursion, or object boundaries, stop.
- A function should stay when its name adds meaning that the body does not show quickly.
- Inline Function pairs well with a later Extract Function that draws a better boundary.
- When several statements must move one by one, Move Statements to Callers can be a safer route.
- This refactoring is about clarity, not shaving off a function call.
- It is especially useful when previous refactorings left behind tiny wrappers with no real value.
- Keep the function if its name captures a business rule the raw condition would hide.
- Inline only after you have found every caller that depends on the wrapper.

## Related Refactorings
- Extract Function
- Move Statements to Callers
- Change Function Declaration
- Remove Dead Code
