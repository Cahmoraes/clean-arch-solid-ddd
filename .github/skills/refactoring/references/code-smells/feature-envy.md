# Feature Envy

## What It Is
Feature envy appears when a function seems more interested
in another module’s data and functions than in its own
home. The classic case is a method that makes a long
series of getter calls on another object to do its real
work.

The smell suggests the behavior and the data that support
it are drifting apart. In most cases, they want to live
together because they change together.

## Why It's a Problem
Feature envy increases coupling between modules and
weakens cohesion inside each one. The caller must
understand a foreign structure in detail just to compute a
result.

When the foreign data shape changes, the envious function
breaks even though its own module may not have changed at
all.

## Example (Bad)
```typescript
class Subscription {
  constructor(
    private readonly monthlyPrice: number,
    private readonly seats: number,
    private readonly billingCycle: "monthly" | "annual",
  ) {}

  getMonthlyPrice() {
    return this.monthlyPrice;
  }

  getSeats() {
    return this.seats;
  }

  getBillingCycle() {
    return this.billingCycle;
  }
}

class BillingSummary {
  totalFor(subscription: Subscription) {
    const base = subscription.getMonthlyPrice() * subscription.getSeats();

    if (subscription.getBillingCycle() === "annual") {
      return base * 12 * 0.9;
    }

    return base;
  }
}
```

## How to Detect
- A method spends most of its time calling methods on
  another object.

- The logic uses more foreign data than local state.

- Long getter chains appear before any real calculation
  happens.

- The function feels easier to explain in terms of another
  class’s responsibility.

- A change to one data structure forces edits in a distant
  calculating method.

- Only one part of a function is envious, while the rest
  belongs where it is.

- Moving the behavior closer to the data would reduce both
  calls and coupling.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Move Function](../../references/moving-features/move-function.md) | When the behavior clearly belongs with the foreign data. |
| [Extract Function](../../references/first-set/extract-function.md) | When only one slice of a larger function is envious. |
| [Extract Class](../../references/encapsulation/extract-class.md) | When a missing abstraction is forcing the behavior to roam. |
