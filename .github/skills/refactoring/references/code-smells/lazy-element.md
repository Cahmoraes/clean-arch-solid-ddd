# Lazy Element

## What It Is
A lazy element is a function, class, or hierarchy that no
longer earns its keep. It may once have promised reuse or
variation, or it may have been created for growth that
never happened.

The smell is not “small element.” It is unnecessary
structure: a wrapper whose name adds no help or a class
that is only one simple function.

Sometimes the element once paid its way, but later
refactoring reduced it to a shell.

## Why It's a Problem
Every extra element adds another place to look, another
abstraction to explain, and another thing to keep
consistent. If the element adds no leverage, it only gets
in the way.

Old scaffolding also misleads readers into expecting
variation or importance that does not exist.

## Example (Bad)
```typescript
class PriceFormatter {
  format(amount: number) {
    return this.render(amount);
  }

  private render(amount: number) {
    return `$${amount.toFixed(2)}`;
  }
}

class LoyaltyLabelService {
  buildLabel(tier: string) {
    return tier.toUpperCase();
  }
}

class PremiumLoyaltyLabelService extends LoyaltyLabelService {}

function formatPrice(amount: number) {
  const formatter = new PriceFormatter();
  return formatter.format(amount);
}
```

## How to Detect
- A function body says exactly what its name says, with no
  extra explanatory value.

- A class exists mainly to host one simple method.

- An inheritance layer adds no real variation.

- The element was expected to grow later, but it never
  did.

- Refactoring has shrunk an element until only the shell
  remains.

- Readers ask why the abstraction exists at all.

- Inlining the element would make the code easier to
  follow immediately.

- A subclass exists only because the hierarchy once
  expected more cases.

- Removing the wrapper would not hide any important
  decision.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Inline Function](../../references/first-set/inline-function.md) | When a function wrapper adds no useful name or structure. |
| [Inline Class](../../references/encapsulation/inline-class.md) | When a class no longer carries enough responsibility to justify itself. |
| [Collapse Hierarchy](../../references/inheritance/collapse-hierarchy.md) | When inheritance adds no meaningful variation. |
