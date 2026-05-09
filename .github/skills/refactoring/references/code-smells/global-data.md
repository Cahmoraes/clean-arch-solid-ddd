# Global Data

## What It Is
Global data is state that any part of the codebase can
read or change. Fowler treats it as one of the most
pungent smells because no local reasoning can tell you who
touched the data last.

The obvious cases are global variables, but the same
problem appears with class variables and singletons. The
core issue is unconstrained reach, not syntax.

## Why It's a Problem
Global data creates spooky action at a distance. Bugs
appear far from the code that changed the state, and
tracking the real source becomes difficult.

The danger becomes worse when the global state is mutable.
Even a small amount may be tolerable, but the cost rises
sharply as more code depends on it.

## Example (Bad)
```typescript
export const runtimeConfig = {
  currency: "USD",
  taxRate: 0.12,
  retryLimit: 3,
  maintenanceMode: false,
};

export function enableMaintenanceMode() {
  runtimeConfig.maintenanceMode = true;
}

export function useBrazilianTax() {
  runtimeConfig.currency = "BRL";
  runtimeConfig.taxRate = 0.17;
}

export function calculateInvoiceTotal(amount: number) {
  return amount + amount * runtimeConfig.taxRate;
}

export function sendInvoice(invoice: Invoice) {
  if (runtimeConfig.maintenanceMode) {
    throw new Error("Maintenance mode");
  }

  return mailer.send({
    currency: runtimeConfig.currency,
    invoice,
  });
}

setTimeout(() => {
  runtimeConfig.retryLimit = 10;
}, 1000);
```

## How to Detect
- Any module can change the value without going through a
  controlled interface.

- A bug report sounds like “something changed this behind
  my back.”

- The codebase relies on singletons, static fields, or
  exported mutable objects for shared state.

- There is no easy way to discover every write to the
  data.

- Tests fail depending on execution order because shared
  state leaks across cases.

- The safest way to reason about a function requires
  reading unrelated modules first.

- Initialization code and runtime behavior both mutate the
  same globally visible object.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Encapsulate Variable](../../references/first-set/encapsulate-variable.md) | When shared data is open to contamination from anywhere. |
| [Combine Functions into Class](../../references/first-set/combine-functions-into-class.md) | When related operations should own the state inside one module boundary. |
| [Remove Setting Method](../../references/refactoring-apis/remove-setting-method.md) | When global configuration should stop changing after startup. |
