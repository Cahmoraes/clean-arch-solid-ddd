# Insider Trading

## What It Is
Insider trading appears when modules know too much about
each other’s internals and trade data too freely. Some
communication is necessary, but Fowler stresses reducing
it and keeping it explicit.

The smell grows stronger when modules collaborate through
private details rather than through narrow, well-
understood interfaces.

## Why It's a Problem
Excess intimacy increases coupling. Changes to one
module’s structure force changes in another module that
should not need that knowledge.

The relationship also blurs ownership because behavior and
data are being shared informally instead of through clear
boundaries.

## Example (Bad)
```typescript
class DiscountEngine {
  apply(order: Order, invoice: Invoice) {
    invoice.lines = order.items.map((item) => ({
      sku: item.sku,
      amount: item.price,
    }));

    invoice.total = order.subtotal;

    if (order.customer.tier === "gold") {
      invoice.total = invoice.total * 0.9;
      invoice.auditNotes.push("gold discount");
    }
  }
}

class InvoiceMailer {
  send(invoice: Invoice, order: Order) {
    order.lastSentInvoiceTotal = invoice.total;
    order.lastSentInvoiceAt = new Date();

    return mailer.send({
      to: order.customer.email,
      total: invoice.total,
      lines: invoice.lines,
    });
  }
}
```

## How to Detect
- Two modules reach into each other’s internal fields
  instead of using a narrow public protocol.

- A change in one data structure forces edits in a peer
  module that manipulates it closely.

- Functions bounce fields back and forth because the
  shared responsibility has no proper home.

- Several modules know the same private details about
  another module’s structure.

- A third concept seems to exist in the overlap between
  two modules.

- Inheritance exposes internals that subclasses exploit
  more than the parent intended.

- Hiding some collaboration behind a delegate or new
  module would reduce the chatter.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Move Function](../../references/moving-features/move-function.md) | When behavior should live with the data it manipulates most. |
| [Move Field](../../references/moving-features/move-field.md) | When state sits in the wrong module and invites intimate access. |
| [Hide Delegate](../../references/encapsulation/hide-delegate.md) | When one module should mediate access to another. |
| [Replace Subclass with Delegate](../../references/inheritance/replace-subclass-with-delegate.md) | When subclass intimacy has gone too far. |
| [Replace Superclass with Delegate](../../references/inheritance/replace-superclass-with-delegate.md) | When superclass-subclass coupling should become looser delegation. |
