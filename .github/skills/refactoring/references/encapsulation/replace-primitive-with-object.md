# Replace Primitive with Object

**Formerly:** Replace Data Value with Object; Replace Type Code with Class | **Inverse of:** —

## When to Use
Use this refactoring when a primitive value starts to carry behavior such as validation, formatting, or comparison rules.
A value object collects that logic in one place and stops the same rules from spreading across the codebase.

## Code Smells Addressed
- Primitive obsession
- Scattered logic around one value

## Example

### Before
```typescript
class Order {
  constructor(
    public data: { priority: string }
  ) {}

  get priority() {
    return this.data.priority
  }
}

function priorityRank(value: string) {
  switch (value) {
    case 'high':
      return 3
    case 'normal':
      return 2
    default:
      return 1
  }
}

function isRush(order: Order) {
  return priorityRank(order.priority) > priorityRank('normal')
}
```

### After
```typescript
class Priority {
  private readonly _value: string

  constructor(value: string) {
    this._value = value
  }

  toString() {
    return this._value
  }

  higherThan(other: Priority) {
    return this.rank() > other.rank()
  }

  private rank() {
    switch (this._value) {
      case 'high':
        return 3
      case 'normal':
        return 2
      default:
        return 1
    }
  }
}

class Order {
  private _priority: Priority

  constructor(data: { priority: string }) {
    this._priority = new Priority(data.priority)
  }

  get priority() {
    return this._priority
  }

  get priorityString() {
    return this._priority.toString()
  }
}
```

## Mechanics
1. Apply **Encapsulate Variable** to the primitive field first.
2. Create a simple value class with a constructor for the old value and one getter or `toString()` method.
3. Run static checks.
4. Change the setter or constructor in the host class so it stores an instance of the new class.
5. Change the getter so it returns the value from the new object or returns the object itself when that is clearer.
6. Test.
7. Rename accessors with **Rename Function** if the old names now mislead readers.
8. Decide whether the new object should behave as a value or a reference, then use the matching follow-up refactoring.

## Notes
- Fowler prefers `toString()` over `getValue()` because it reads as a conversion, not as a field leak.
- Start with a tiny wrapper. Move validation and comparison logic only after the new object is in place.
- This is especially useful for values such as priorities, phone numbers, money, and ranges.
- You may need a companion accessor like `priorityString` while clients migrate to the richer object API.
- Once the value object exists, rules such as ordering or legality belong there, not in client code.

## Related Refactorings
- Encapsulate Variable
- Rename Function
- Change Reference to Value
- Change Value to Reference
