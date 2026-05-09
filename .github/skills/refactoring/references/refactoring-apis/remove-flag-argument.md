# Remove Flag Argument

**Formerly:** Replace Parameter with Explicit Methods | **Inverse of:** —

## When to Use
Use this refactoring when a caller passes a literal boolean, enum, or string
only to choose which branch a function should run.
Replace the flag with explicit functions so the call states its intent.

## Code Smells Addressed
- A flag argument that hides available behaviors behind a single signature.

- Call sites that use values like `true` or `"premium"` without saying what
  they mean.

## Example

### Before
```typescript
function deliveryDate(order: Order, isRush: boolean) {
  if (isRush) {
    return rushDate(order);
  }

  return regularDate(order);
}

shipment.deliveryDate = deliveryDate(order, true);
```

### After
```typescript
function rushDeliveryDate(order: Order) {
  return rushDate(order);
}

function regularDeliveryDate(order: Order) {
  return regularDate(order);
}

shipment.deliveryDate = rushDeliveryDate(order);
```

## Mechanics
1. Create an explicit function for each value of the flag.

2. If the original function has a clear dispatch conditional, use Decompose
   Conditional to carve out the explicit functions. Otherwise, create small
   wrapping functions.

3. For each caller that passes a literal value, replace the call with the
   matching explicit function.

## Notes
- Fowler only calls it a flag argument when callers pass a literal and the
  callee uses that value to steer control flow.

- Boolean flags are especially poor because a call like `deliveryDate(order,
  true)` does not explain itself.

- If callers pass data that flows through the program, the parameter is not
  a flag in this sense.

- If some callers pass literals and others pass data, keep the original
  function for the data callers and only replace the literal ones.

- Explicit functions also help code analysis tools see the difference between
  the available behaviors.

- Multiple flags can point to a function that does too much and should be
  broken into simpler, composable operations.

- When the flag logic is tangled, wrapper functions are fine. You do not
  have to force a top-level dispatch first.

- If no caller should use the old helper directly, reduce its visibility or
  rename it to make that clear.

## Related Refactorings
- Decompose Conditional

- Change Function Declaration
