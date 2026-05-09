# Refused Bequest

## What It Is
Refused bequest appears when a subclass inherits data or
behavior it does not want or does not support. The
subclass picks through the parent’s gifts and uses only a
small part of them.

Fowler treats this as a smell, but usually a faint one.
Reusing implementation is often acceptable; the stronger
problem appears when the subclass refuses the superclass
interface itself.

The smell matters most when the subclass rejects the
parent's interface, not merely some reusable implementation
details.

## Why It's a Problem
A mismatched hierarchy confuses readers because
inheritance promises more commonality than the design
really has. Unsupported inherited behavior often shows up
as empty overrides or exceptions.

If the subclass cannot honestly support the parent
interface, the hierarchy is actively misleading.

## Example (Bad)
```typescript
class LoyaltyCustomer {
  addPoints(points: number) {
    this.points += points;
  }

  redeemPoints(points: number) {
    this.points -= points;
  }
}

class WalkInCustomer extends LoyaltyCustomer {
  addPoints() {
    throw new Error("Walk-in customers do not collect points");
  }

  redeemPoints() {
    throw new Error("Walk-in customers do not redeem points");
  }
}
```

## How to Detect
- A subclass inherits behavior it does not use.

- Inherited methods are overridden only to throw, noop, or
  reject the parent contract.

- The parent contains code that is meaningful only for one
  sibling branch.

- Readers cannot trust the superclass interface across its
  subclasses.

- Most of the hierarchy is fine, but one subclass feels
  like an awkward reuse shortcut.

- Pushing specialized behavior down would make the parent
  more honest.

- If the interface itself is wrong, delegation is likely
  safer than tweaking the hierarchy.

- A subclass advertises a capability only to reject it at
  runtime.

- Delegation would describe the relationship more honestly
  than inheritance.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Push Down Method](../../references/inheritance/push-down-method.md) | When inherited behavior belongs only in a specific subclass branch. |
| [Push Down Field](../../references/inheritance/push-down-field.md) | When inherited state is not truly common. |
| [Replace Subclass with Delegate](../../references/inheritance/replace-subclass-with-delegate.md) | When the subclass reuses implementation but should not inherit the interface. |
| [Replace Superclass with Delegate](../../references/inheritance/replace-superclass-with-delegate.md) | When superclass structure should become explicit delegation instead. |
