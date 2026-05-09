# Comments

## What It Is
Comments are not inherently a bad smell. Fowler includes
them here because they are often used as deodorant over
code that still smells.

When a comment exists mainly to explain what confusing
code does, the better move is usually to improve the code
so the explanation becomes unnecessary.

When you feel the urge to write a comment, the book
recommends trying refactoring first.

## Why It's a Problem
Comments that explain poor structure treat the symptom
instead of the cause. They can drift away from the code
and let readers trust words that no longer match reality.

The best comments explain why, uncertainty, or important
constraints. They should not carry the burden of naming or
structuring the code for us.

## Example (Bad)
```typescript
function chargeCustomer(order: Order) {
  // find the amount we should charge, including tax and freight
  let value = 0;

  for (const item of order.items) {
    value += item.price * item.quantity;
  }

  // if the order is international, we need to add freight now
  if (order.destination.country !== "US") {
    value += 35;
  }

  // gold customers do not pay freight over 500
  if (order.customer.tier === "gold" && value > 500) {
    value -= 35;
  }

  // actually charge the customer card
  paymentGateway.charge(order.customer.cardToken, value);
}
```

## How to Detect
- A comment explains what a block of code does because the
  code itself is hard to read.

- Thickly commented code still feels confusing underneath
  the prose.

- A block comment could become the name of an extracted
  function.

- The code needs comments to describe required state or
  assumptions.

- Comments repeat the mechanics instead of explaining the
  why.

- Refactoring could remove the need for the comment
  entirely.

- Useful comments remain for intent, uncertainty, or
  rationale after the structure improves.

- A comment is doing work that a better name should do.

- The prose exists mainly to compensate for long functions,
  duplication, or tangled conditionals.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Extract Function](../../references/first-set/extract-function.md) | When a comment names one coherent block of behavior. |
| [Change Function Declaration](../../references/first-set/change-function-declaration.md) | When the extracted method still needs a clearer intention-revealing name. |
| [Introduce Assertion](../../references/conditional-logic/introduce-assertion.md) | When a comment describes required system state that code should check directly. |
