# Repeated Switches

## What It Is
Repeated switches occur when the same conditional dispatch
logic appears in several places. Fowler narrows the smell
to repetition: the problem is not every switch, but the
need to update many of them whenever a new case appears.

The repeated logic may use a `switch` statement or a long
`if/else` cascade. Either way, the same branching rule has
been copied into multiple contexts.

## Why It's a Problem
Every new clause becomes a scavenger hunt because all
matching branches must be found and updated. Missing one
leaves the system inconsistent.

The branching rule dominates design instead of letting
behavior travel with the case that varies.

## Example (Bad)
```typescript
type ShipmentMethod = "pickup" | "courier" | "locker";

function deliveryLabel(method: ShipmentMethod) {
  switch (method) {
    case "pickup":
      return "Collect at store";
    case "courier":
      return "Deliver to address";
    case "locker":
      return "Deliver to locker";
  }
}

function deliveryFee(method: ShipmentMethod) {
  switch (method) {
    case "pickup":
      return 0;
    case "courier":
      return 15;
    case "locker":
      return 6;
  }
}

function deliveryEta(method: ShipmentMethod) {
  switch (method) {
    case "pickup":
      return "same day";
    case "courier":
      return "2 days";
    case "locker":
      return "1 day";
  }
}
```

## How to Detect
- The same branching logic appears in several functions or
  modules.

- Adding one new case means searching the codebase for
  every matching switch.

- Different switches fall out of sync because one case
  gets updated in some places but not others.

- The repeated logic branches on the same code, type, or
  role each time.

- The variation belongs to a concept that could own
  behavior directly.

- Each switch body is small, but the repeated coordination
  cost is large.

- Reviewers ask whether all switches were updated for the
  new case.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Replace Conditional with Polymorphism](../../references/conditional-logic/replace-conditional-with-polymorphism.md) | When repeated dispatch should move into the varying types. |
| [Extract Function](../../references/first-set/extract-function.md) | When you need to isolate branch behavior before replacing the dispatch. |
