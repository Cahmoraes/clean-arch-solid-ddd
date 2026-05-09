# Temporary Field

## What It Is
A temporary field is set only in certain circumstances,
even though the class otherwise suggests the field is
always part of the object. That mismatch makes the object
harder to understand.

Readers expect an object to need all of its fields. When
one field is meaningful only during a particular path, the
class is hiding a smaller concept inside itself.

## Why It's a Problem
Temporary fields force readers to ask when the field is
valid and why it exists at all. They often drag
conditional logic into the class just to protect one
special mode.

That uncertainty spreads through the rest of the methods,
which now need to handle partially meaningful state.

## Example (Bad)
```typescript
class DiscountPreviewService {
  private customer: Customer | null = null;
  private items: OrderItem[] = [];
  private subtotal = 0;

  preview(customer: Customer, items: OrderItem[]) {
    this.customer = customer;
    this.items = items;
    this.subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const discount = this.customer.tier === "gold"
      ? this.subtotal * 0.1
      : 0;

    this.customer = null;
    this.items = [];
    this.subtotal = 0;

    return discount;
  }

  logCurrentState() {
    return {
      customerId: this.customer?.id,
      itemCount: this.items.length,
      subtotal: this.subtotal,
    };
  }
}
```

## How to Detect
- A field is populated only on one execution path or in
  one mode of the object.

- Methods need null checks or guards because some fields
  are not always meaningful.

- Understanding the class requires knowing a specific
  sequence of method calls first.

- A field looks like core state but behaves like scratch
  space for one calculation.

- Conditional logic exists mainly to handle whether the
  field is valid right now.

- The suspicious fields seem to belong together more than
  they belong to the host class.

- A special-case object would remove the need for “not
  valid in this situation” checks.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Extract Class](../../references/encapsulation/extract-class.md) | When temporary fields deserve a smaller home of their own. |
| [Move Function](../../references/moving-features/move-function.md) | When behavior tied to the temporary fields should follow them. |
| [Introduce Special Case](../../references/conditional-logic/introduce-special-case.md) | When an alternative object can represent the invalid or absent state cleanly. |
