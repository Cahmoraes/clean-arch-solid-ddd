# Large Class

## What It Is
A large class tries to do too much. The first visible
signal is often too many fields, but too much code is just
as telling because large classes tend to gather
duplication, confusion, and unrelated responsibilities.

Fowler recommends looking for groups of variables or
behaviors that naturally belong together, especially when
prefixes, suffixes, or client usage patterns reveal
subsets.

## Why It's a Problem
Large classes are hard to understand because readers must
load many unrelated concerns into memory at once. They
also become breeding grounds for duplicated code and
chaotic change.

Clients often use only fragments of the class, which is a
strong clue that the abstraction should be split.

## Example (Bad)
```typescript
class CustomerAccount {
  id = "";
  name = "";
  email = "";
  phone = "";
  billingStreet = "";
  billingCity = "";
  billingState = "";
  billingPostalCode = "";
  shippingStreet = "";
  shippingCity = "";
  shippingState = "";
  shippingPostalCode = "";
  loyaltyPoints = 0;
  loyaltyTier = "standard";
  balance = 0;
  creditLimit = 0;

  calculateCreditUsage() {
    return this.balance / this.creditLimit;
  }

  printBillingAddress() {
    return `${this.billingStreet}, ${this.billingCity}, ${this.billingState} ${this.billingPostalCode}`;
  }

  printShippingAddress() {
    return `${this.shippingStreet}, ${this.shippingCity}, ${this.shippingState} ${this.shippingPostalCode}`;
  }

  applyLoyaltyBonus(orderTotal: number) {
    if (this.loyaltyTier === "gold") return orderTotal * 0.9;
    return orderTotal;
  }
}
```

## How to Detect
- The class has many fields and several of them cluster
  into smaller concepts.

- Different clients use different subsets of the class
  interface.

- Duplicated code appears inside the class because similar
  responsibilities sit together.

- Common prefixes or suffixes suggest fields that belong
  in a component.

- Some methods operate on only one subset of fields.

- You describe the class by listing many unrelated jobs.

- Inheritance or extracted components would make the
  boundaries more meaningful.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Extract Class](../../references/encapsulation/extract-class.md) | When groups of fields and methods form a clearer component. |
| [Extract Superclass](../../references/inheritance/extract-superclass.md) | When common behavior should move into a shared parent. |
| [Replace Type Code with Subclasses](../../references/inheritance/replace-type-code-with-subclasses.md) | When a type code is propping up multiple role-specific behaviors. |
| [Extract Function](../../references/first-set/extract-function.md) | When large methods inside the class contain duplication and mixed intent. |
| [Inline Class](../../references/encapsulation/inline-class.md) | When previous splitting created tiny classes but the real problem remains elsewhere. |
