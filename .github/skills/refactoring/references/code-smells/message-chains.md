# Message Chains

## What It Is
Message chains appear when a client asks one object for
another, then another, then another. The visible shape is
a long chain of calls or a ladder of temporary variables
that navigate through object relationships.

The core smell is structural coupling. The client is now
tied to the path of navigation, not just to the service it
really needs.

## Why It's a Problem
Changes in intermediate relationships ripple out to every
client that walks the chain. A client that should care
about an answer now cares about how to reach it.

The chain also signals that useful behavior may be
stranded at the wrong point in the object graph.

That fragility is the price of exposing navigation instead
of behavior.

## Example (Bad)
```typescript
class OrderPresenter {
  cityLabel(order: Order) {
    return order
      .customer()
      .primaryAccount()
      .billingProfile()
      .address()
      .city()
      .toUpperCase();
  }

  countryLabel(order: Order) {
    const customer = order.customer();
    const account = customer.primaryAccount();
    const profile = account.billingProfile();
    const address = profile.address();

    return address.country().toUpperCase();
  }
}
```

## How to Detect
- A client repeatedly asks for one object in order to
  reach another object.

- Navigation through relationships appears as a long call
  chain or ladder of temporary variables.

- Clients break whenever an intermediate relationship
  changes.

- The code reveals object structure that should stay
  hidden behind a simpler interface.

- Several clients travel the same path to reach the same
  final object.

- The final object is used for a computation that could
  likely move closer to it.

- Attempts to hide every step blindly would turn
  intermediates into pure forwarding objects.

- A client wants one answer, but must know several
  relationships to get it.

- The same navigation path appears in multiple services or
  presenters.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Hide Delegate](../../references/encapsulation/hide-delegate.md) | When a client should not know the navigation path. |
| [Extract Function](../../references/first-set/extract-function.md) | When part of the client logic can be isolated before moving. |
| [Move Function](../../references/moving-features/move-function.md) | When behavior should move down the chain closer to the final data. |
| [Remove Middle Man](../../references/encapsulation/remove-middle-man.md) | When over-hiding has already produced excessive forwarding. |
