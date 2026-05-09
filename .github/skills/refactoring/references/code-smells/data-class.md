# Data Class

## What It Is
A data class holds fields plus getting and setting
methods, but little or no behavior. Fowler calls these
classes dumb data holders because other classes manipulate
them in too much detail.

The smell is not every simple record. It is most
concerning when mutable state sits exposed and external
code keeps doing the real work.

## Why It's a Problem
Data classes encourage feature envy because clients
perform behavior that belongs with the data. The result is
duplicated logic and weak encapsulation.

They also invite uncontrolled mutation, especially when
setters exist for fields that should be stable.

## Example (Bad)
```typescript
class ShipmentRecord {
  private street = "";
  private city = "";
  private state = "";
  private postalCode = "";

  getStreet() {
    return this.street;
  }

  setStreet(value: string) {
    this.street = value;
  }

  getCity() {
    return this.city;
  }

  setCity(value: string) {
    this.city = value;
  }

  getState() {
    return this.state;
  }

  setState(value: string) {
    this.state = value;
  }

  getPostalCode() {
    return this.postalCode;
  }

  setPostalCode(value: string) {
    this.postalCode = value;
  }
}
```

## How to Detect
- A class mainly contains fields plus trivial getters and
  setters.

- Other classes perform the real calculations or
  formatting on its data.

- Public fields or unrestricted setters expose state
  directly.

- The class has no meaningful behavior beyond storage.

- Client code repeatedly reconstructs behavior from the
  same fields.

- Immutable result records are the exception; mutable
  holders are the stronger smell.

- Moving behavior in would make clients smaller and the
  data richer.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Encapsulate Record](../../references/encapsulation/encapsulate-record.md) | When public fields need a controlled interface immediately. |
| [Remove Setting Method](../../references/refactoring-apis/remove-setting-method.md) | When some fields should not change after creation. |
| [Move Function](../../references/moving-features/move-function.md) | When behavior belongs with the data holder. |
| [Extract Function](../../references/first-set/extract-function.md) | When only part of a client method can move into the data class. |
| [Split Phase](../../references/first-set/split-phase.md) | When a simple immutable result record is legitimate after a separate phase. |
