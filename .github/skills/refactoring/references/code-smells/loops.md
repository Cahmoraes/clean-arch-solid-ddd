# Loops

## What It Is
Loops become a smell when they obscure which elements are
selected and what is done with them. Fowler argues that
first-class functions let many loops retire in favor of
pipelines that expose intent more clearly.

The point is not that iteration is evil. The point is that
filter, map, and related operations often make the data
flow easier to read than manual accumulation.

Pipelines also make it easier to see which elements enter
the computation and what transformation each step applies.

## Why It's a Problem
Manual loops mix selection, transformation, and
accumulation details into one block. Readers must simulate
the control flow to understand the result.

When one loop does more than one thing, the logic becomes
especially hard to name and to change.

## Example (Bad)
```typescript
function summarizePaidOrders(orders: Order[]) {
  const paidOrders: Order[] = [];

  for (const order of orders) {
    if (order.status === "paid") {
      paidOrders.push(order);
    }
  }

  const totals: number[] = [];

  for (const order of paidOrders) {
    totals.push(order.items.reduce((sum, item) => sum + item.price, 0));
  }

  let grandTotal = 0;

  for (const total of totals) {
    grandTotal += total;
  }

  return {
    count: paidOrders.length,
    grandTotal,
  };
}
```

## How to Detect
- A loop hides a simple filter, map, or sum operation.

- Readers must inspect mutation of accumulators to infer
  the result.

- One loop performs multiple responsibilities in sequence.

- Temporary collections exist only to feed the next loop.

- The loop body is harder to name than the transformation
  it should express.

- Pipeline operations would show the included elements and
  the transformation more directly.

- A reader has to trace accumulator updates before knowing
  the business meaning.

- The loop creates staging arrays only because the
  transformation is expressed imperatively.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Replace Loop with Pipeline](../../references/moving-features/replace-loop-with-pipeline.md) | When filter, map, and reduce can state the intent directly. |
| [Split Loop](../../references/moving-features/split-loop.md) | When one loop currently performs several distinct jobs. |
