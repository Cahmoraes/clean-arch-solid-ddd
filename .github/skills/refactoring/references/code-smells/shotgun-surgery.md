# Shotgun Surgery

## What It Is
Shotgun surgery is the opposite shape of divergent change.
Instead of one module changing for many reasons, one
change request forces many small edits across many
modules.

The smell shows that behavior which should change together
has been scattered. The system makes simple changes feel
like a hunt across the codebase.

## Why It's a Problem
Scattered edits are easy to miss, so the risk of partial
changes rises. They also make change sets noisy because
the real behavior lives in fragments.

The team spends effort locating all the pieces instead of
reasoning about the new rule itself.

## Example (Bad)
```typescript
class CustomerProfile {
  loyaltyTier = "standard";
}

class PricingService {
  priceFor(customer: CustomerProfile, subtotal: number) {
    if (customer.loyaltyTier === "gold") return subtotal * 0.9;
    if (customer.loyaltyTier === "silver") return subtotal * 0.95;
    return subtotal;
  }
}

class ShippingService {
  shippingFor(customer: CustomerProfile) {
    if (customer.loyaltyTier === "gold") return 0;
    if (customer.loyaltyTier === "silver") return 5;
    return 10;
  }
}

class EmailComposer {
  loyaltyCopy(customer: CustomerProfile) {
    if (customer.loyaltyTier === "gold") return "Gold perks applied";
    if (customer.loyaltyTier === "silver") return "Silver perks applied";
    return "Standard pricing applied";
  }
}

class AnalyticsPayloadBuilder {
  build(customer: CustomerProfile) {
    return { loyaltyTier: customer.loyaltyTier };
  }
}
```

## How to Detect
- A small rule change requires touching many files or
  classes.

- You keep a mental checklist of every place that must be
  edited for one feature.

- Commits for one concern scatter across pricing,
  messaging, persistence, and analytics.

- Missing one update creates inconsistent behavior
  immediately.

- Several functions operate on the same cluster of data
  but live far apart.

- The codebase resists localized change even when the
  business rule feels singular.

- Refactoring toward one home for the logic first would
  make the feature easier to add.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Move Function](../../references/moving-features/move-function.md) | When related behavior should change in one module. |
| [Move Field](../../references/moving-features/move-field.md) | When the state that drives the change belongs elsewhere. |
| [Combine Functions into Class](../../references/first-set/combine-functions-into-class.md) | When many functions operate on the same data. |
| [Combine Functions into Transform](../../references/first-set/combine-functions-into-transform.md) | When scattered steps enrich one data structure. |
| [Split Phase](../../references/first-set/split-phase.md) | When a shared preparation step can feed a later phase. |
| [Inline Function](../../references/first-set/inline-function.md) | When pulling logic together is the fastest path to reorganizing it. |
| [Inline Class](../../references/encapsulation/inline-class.md) | When separation is so poor that merging is the clearest intermediate move. |
