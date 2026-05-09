# Data Clumps

## What It Is
Data clumps are groups of fields or parameters that
repeatedly appear together. Fowler describes them as
values that keep hanging around in packs and ought to find
a home together.

The first clue is often repeated fields across classes or
repeated argument groups across signatures. Those values
usually represent one concept that has not yet been
modeled directly.

## Why It's a Problem
Data clumps bloat parameter lists and duplicate structure
across the codebase. They force callers to reconstruct one
concept from many scattered pieces.

They also hide missing behavior. Once the values become an
object, behavior often follows and duplication falls away.

## Example (Bad)
```typescript
class CustomerProfile {
  constructor(
    readonly street: string,
    readonly city: string,
    readonly state: string,
    readonly postalCode: string,
  ) {}
}

function createInvoice(
  customerId: string,
  street: string,
  city: string,
  state: string,
  postalCode: string,
) {
  return { customerId, street, city, state, postalCode };
}

function createShipment(
  orderId: string,
  street: string,
  city: string,
  state: string,
  postalCode: string,
) {
  return { orderId, street, city, state, postalCode };
}

function formatLabel(
  street: string,
  city: string,
  state: string,
  postalCode: string,
) {
  return `${street}, ${city}, ${state} ${postalCode}`;
}
```

## How to Detect
- The same three or four values appear together in
  multiple classes.

- Method signatures repeat the same argument group again
  and again.

- Deleting one value would make the remaining values lose
  their meaning together.

- Call sites assemble one concept from separate arguments
  each time.

- Different modules keep formatting or validating the same
  cluster of fields.

- You can point to a bundle of values that feels like an
  unnamed object.

- The repeated group invites behavior that has no proper
  place today.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Extract Class](../../references/encapsulation/extract-class.md) | When repeated fields should become one object. |
| [Introduce Parameter Object](../../references/first-set/introduce-parameter-object.md) | When repeated argument groups should move as one value. |
| [Preserve Whole Object](../../references/refactoring-apis/preserve-whole-object.md) | When callers already have the larger source object. |
| [Move Function](../../references/moving-features/move-function.md) | When behavior should follow the newly created object. |
