# Middle Man

## What It Is
Middle man appears when a class delegates too much of its
interface to another class. Delegation is a normal part of
encapsulation, but it becomes a smell when the wrapper
adds little beyond forwarding.

At that point, the client might as well talk to the real
object that knows what is happening.

## Why It's a Problem
Excessive forwarding creates another layer to read and
maintain without adding meaningful behavior. It obscures
where the real logic lives.

The wrapper also becomes a bottleneck for change because
every forwarded method must stay synchronized with the
delegate.

## Example (Bad)
```typescript
class Department {
  manager() {
    return this._manager;
  }

  budget() {
    return this._budget;
  }

  headcount() {
    return this._headcount;
  }
}

class Employee {
  constructor(private readonly department: Department) {}

  manager() {
    return this.department.manager();
  }

  budget() {
    return this.department.budget();
  }

  headcount() {
    return this.department.headcount();
  }
}
```

## How to Detect
- A class interface contains many methods that simply call
  through to another object.

- The wrapper adds little or no behavior beyond
  delegation.

- Clients conceptually want the delegate, not the
  forwarding shell.

- Keeping the forwarding methods in sync is busywork.

- Inlining a few methods would make the call path more
  direct immediately.

- The design added delegation for encapsulation, then kept
  adding it until it dominated the class.

- Inheritance or wrapper structure may be hiding the real
  object more than helping users of it.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Remove Middle Man](../../references/encapsulation/remove-middle-man.md) | When clients should talk directly to the real object. |
| [Inline Function](../../references/first-set/inline-function.md) | When only a few delegating methods need to disappear. |
| [Replace Superclass with Delegate](../../references/inheritance/replace-superclass-with-delegate.md) | When wrapper inheritance should fold into explicit delegation. |
| [Replace Subclass with Delegate](../../references/inheritance/replace-subclass-with-delegate.md) | When subclassing created a forwarding shell instead of real specialization. |
