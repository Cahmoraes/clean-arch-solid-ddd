# Long Function

## What It Is
Long functions force readers to hold too much detail in
mind at once. Fowler argues that programs age well when
they contain short functions with strong names, because
indirection buys explanation, sharing, and choice.

The real issue is not raw line count but semantic
distance. When one function mixes several intentions and
levels of abstraction, the reader loses the storyline.

## Why It's a Problem
Long functions are harder to understand, harder to reuse,
and harder to change safely. They also make it difficult
to isolate rules for testing or to see which part of the
function deserves a different home.

Temporary variables, loops, and nested conditionals often
accumulate inside them, making extraction feel expensive
even when extraction is exactly what the code needs.

## Example (Bad)
```typescript
async function checkout(order: Order, user: User, coupon: string | null) {
  let total = 0;
  let shippingCost = 0;
  let discount = 0;
  let warning = "";

  if (order.items.length === 0) {
    throw new Error("Cannot checkout an empty order");
  }

  for (const item of order.items) {
    total += item.price * item.quantity;

    if (item.requiresColdChain) {
      shippingCost += 25;
    } else {
      shippingCost += 10;
    }
  }

  if (coupon) {
    const promotion = await promotionRepository.findByCode(coupon);

    if (promotion && promotion.active) {
      discount = total * promotion.rate;
    } else {
      warning = "Coupon ignored";
    }
  }

  if (user.membership === "gold" && total > 200) {
    shippingCost = 0;
  }

  const finalTotal = total + shippingCost - discount;
  await paymentGateway.charge(user.id, finalTotal);
  await orderRepository.save({ ...order, total: finalTotal });
  await auditLog.record({ userId: user.id, total: finalTotal, warning });

  return {
    subtotal: total,
    shippingCost,
    discount,
    finalTotal,
    warning,
  };
}
```

## How to Detect
- You feel the need to add comments to explain what
  separate parts of the function are doing.

- The function mixes validation, calculation, persistence,
  and notification in one flow.

- Local temporary variables and parameters make extraction
  awkward.

- Different blocks operate at different levels of
  abstraction, from business rules to storage calls.

- Large conditionals or loops dominate the body.

- Naming the function precisely becomes impossible without
  using broad verbs like `handle` or `process`.

- A small rule change requires rereading a long narrative
  before you can touch one step.

- You cannot describe one section without saying, “in the
  middle of that big function.”

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Extract Function](../../references/first-set/extract-function.md) | When a block has one purpose that deserves its own name. |
| [Replace Temp with Query](../../references/encapsulation/replace-temp-with-query.md) | When temporary variables block extractions. |
| [Introduce Parameter Object](../../references/first-set/introduce-parameter-object.md) | When many related parameters travel together. |
| [Preserve Whole Object](../../references/refactoring-apis/preserve-whole-object.md) | When callers pass many values taken from the same source object. |
| [Replace Function with Command](../../references/refactoring-apis/replace-function-with-command.md) | When state and sequencing still block clean extraction. |
| [Decompose Conditional](../../references/conditional-logic/decompose-conditional.md) | When conditionals are large enough to hide intent. |
| [Replace Conditional with Polymorphism](../../references/conditional-logic/replace-conditional-with-polymorphism.md) | When repeated branching depends on type or role. |
| [Split Loop](../../references/moving-features/split-loop.md) | When one loop performs more than one job. |
