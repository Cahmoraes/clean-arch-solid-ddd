# Alternative Classes with Different Interfaces

## What It Is
Alternative classes with different interfaces provide
similar behavior through different method names or
protocols. That blocks substitution, one of the big
benefits of using classes in the first place.

The smell does not mean the implementations must be
identical. It means the public ways of using them are
needlessly different.

Clients can see the family resemblance, but the API makes
them treat the classes as unrelated.

## Why It's a Problem
Different interfaces prevent clients from treating similar
things the same way. They force adapter code,
conditionals, or duplicated client logic just to bridge
naming differences.

The inconsistency also hides common structure that could
make the design simpler and more reusable.

## Example (Bad)
```typescript
class PaypalGateway {
  pay(amount: number) {
    return { provider: "paypal", amount };
  }
}

class BankTransferGateway {
  submitTransfer(total: number) {
    return { provider: "bank", amount: total };
  }
}

class CheckoutService {
  completeWithPaypal(gateway: PaypalGateway, amount: number) {
    return gateway.pay(amount);
  }

  completeWithBank(gateway: BankTransferGateway, amount: number) {
    return gateway.submitTransfer(amount);
  }
}
```

## How to Detect
- Two classes solve the same kind of problem but expose
  different method names.

- Clients need separate code paths only because protocols
  differ.

- One class could substitute for another if the interfaces
  matched.

- The same high-level workflow is duplicated with only
  vocabulary changes.

- Moving behavior into the classes would reveal a more
  uniform protocol.

- Commonality is real, but the public contracts make it
  hard to use.

- A shared superclass or aligned signatures would reduce
  client branching.

- The team talks about converting from one API shape to
  another for equivalent operations.

- Common client code cannot be shared because the last
  method call uses different names.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Change Function Declaration](../../references/first-set/change-function-declaration.md) | When method names or signatures need to line up. |
| [Move Function](../../references/moving-features/move-function.md) | When behavior should move until the protocols converge. |
| [Extract Superclass](../../references/inheritance/extract-superclass.md) | When shared protocol and behavior deserve one abstraction. |
