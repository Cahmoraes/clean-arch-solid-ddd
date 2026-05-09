# Change Function Declaration

**Formerly:** Rename Method, Add Parameter, Remove Parameter | **Inverse of:** —

## When to Use
Use this refactoring when a function name or parameter list no longer fits what callers need.
It helps because function declarations are the joints of a program: a clearer declaration makes the whole design easier to use and evolve.

## Code Smells Addressed
- Mysterious name
- Long or inappropriate parameter list

## Example

### Before
```typescript
function circum(radius: number) {
  return 2 * Math.PI * radius
}

function inNewEngland(customer: Customer) {
  return ["MA", "CT", "ME", "VT", "NH", "RI"].includes(
    customer.address.state,
  )
}

type Customer = {
  address: {
    state: string
  }
}
```

### After
```typescript
function circumference(radius: number) {
  return 2 * Math.PI * radius
}

function inNewEngland(stateCode: string) {
  return ["MA", "CT", "ME", "VT", "NH", "RI"].includes(stateCode)
}

type Customer = {
  address: {
    state: string
  }
}

const customer = { address: { state: "MA" } }
console.log(circumference(10))
console.log(inNewEngland(customer.address.state))
```

## Mechanics
1. If you are removing a parameter, first make sure the body does not use it.
   Delete or replace those uses before you touch the declaration.
2. Change the function declaration to the new form.
   Rename it, add parameters, remove parameters, or reorder them.
3. Find every reference to the old declaration.
   Update each caller to use the new declaration.
4. Test.
   This is the simple route when you can change every caller at once.
5. If you cannot update every caller in one pass, refactor the body to ease extraction.
   Fowler uses a migration strategy for public or widely used functions.
6. Extract the desired implementation into a new function.
   Give it a temporary name if the final name is already taken.
7. Add any extra parameters the new function needs.
   Use the simple mechanics for that addition.
8. Test.
   Confirm the new function behaves correctly before redirecting callers.
9. Inline the old function into its callers.
   This moves call sites over to the new declaration gradually.
10. Rename the temporary function to the final name if needed.
    Remove the temporary name once migration is complete.
11. Test again.
    Finish only after the old declaration is gone or safely deprecated.

## Notes
- Fowler advises separating distinct changes; rename first, then change parameters, or the reverse.
- For published APIs, you may keep a forwarding function for a while and mark it deprecated.
- Passing less data is often an improvement; a state code can be better than a whole customer record.
- The declaration should reflect the abstraction you want callers to depend on.
- Changing a function declaration often exposes better opportunities for moving behavior.
- This refactoring appears under several older names because it covers several common edits at one seam.
- The migration path matters when callers live across a large codebase.

## Related Refactorings
- Extract Function
- Inline Function
- Introduce Parameter Object
- Remove Flag Argument
