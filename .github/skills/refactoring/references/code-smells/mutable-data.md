# Mutable Data

## What It Is
Mutable data becomes a smell when updates can happen
freely and their consequences are hard to predict. Fowler
notes that unrestricted updates are a rich source of
surprising failures, especially when one part of the
system silently depends on earlier state.

The risk grows with scope. A tiny local mutation may be
harmless, but wide-ranging mutable state quickly becomes
difficult to monitor and evolve.

## Why It's a Problem
Unexpected updates make bugs intermittent and hard to
reproduce. Readers must track not only what data means,
but also every place where that meaning may have changed.

Derived mutable values are especially costly because they
duplicate information that could be calculated on demand.
They invite drift between the source and the copy.

## Example (Bad)
```typescript
type Cart = {
  items: Array<{ price: number; quantity: number }>;
  subtotal: number;
  discount: number;
  total: number;
};

function addItem(cart: Cart, price: number, quantity: number) {
  cart.items.push({ price, quantity });
  cart.subtotal = cart.subtotal + price * quantity;
  cart.total = cart.subtotal - cart.discount;
}

function applyDiscount(cart: Cart, rate: number) {
  cart.discount = cart.subtotal * rate;
  cart.total = cart.subtotal - cart.discount;
}

function removeLastItem(cart: Cart) {
  const item = cart.items.pop();

  if (!item) {
    return;
  }

  cart.subtotal = cart.subtotal - item.price * item.quantity;
  cart.total = cart.subtotal - cart.discount;
}

function printReceipt(cart: Cart) {
  return `Subtotal: ${cart.subtotal} | Discount: ${cart.discount} | Total: ${cart.total}`;
}

const cart: Cart = { items: [], subtotal: 0, discount: 0, total: 0 };
addItem(cart, 100, 2);
applyDiscount(cart, 0.1);
removeLastItem(cart);
```

## How to Detect
- State changes in one place break assumptions made
  elsewhere.

- The same variable is updated repeatedly to represent
  different ideas over time.

- A value is stored even though it can be derived from
  other data.

- Side-effect-free logic and mutating logic are
  interleaved in the same block.

- Callers must invoke mutating APIs even when they only
  want information.

- Setters spread across the codebase and make ownership of
  the state unclear.

- The wider the variable scope becomes, the harder it is
  to trust the current value.

- Code mutates parts of a structured object in place
  instead of replacing the whole value.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Encapsulate Variable](../../references/first-set/encapsulate-variable.md) | When updates need a narrow, observable access path. |
| [Split Variable](../../references/organizing-data/split-variable.md) | When one variable stores different meanings at different times. |
| [Slide Statements](../../references/moving-features/slide-statements.md) | When you need to separate pure logic from mutating statements. |
| [Extract Function](../../references/first-set/extract-function.md) | When pure calculations should be isolated from updates. |
| [Separate Query from Modifier](../../references/refactoring-apis/separate-query-from-modifier.md) | When callers should not trigger side effects just to read data. |
| [Remove Setting Method](../../references/refactoring-apis/remove-setting-method.md) | When external mutation should be eliminated. |
| [Replace Derived Variable with Query](../../references/organizing-data/replace-derived-variable-with-query.md) | When stored derived state can be calculated instead. |
| [Combine Functions into Class](../../references/first-set/combine-functions-into-class.md) | When a smaller owner should control the mutable state. |
| [Combine Functions into Transform](../../references/first-set/combine-functions-into-transform.md) | When a data transformation pipeline can confine updates. |
| [Change Reference to Value](../../references/organizing-data/change-reference-to-value.md) | When replacing whole values is safer than in-place mutation. |
