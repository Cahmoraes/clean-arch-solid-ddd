# Change Reference to Value

**Formerly:** — | **Inverse of:** Change Value to Reference

## When to Use
Use this refactoring when a nested object should behave like an immutable value instead of shared mutable state.
Fowler recommends it when you want easier reasoning, safer copying, and fewer surprises from hidden updates.

## Code Smells Addressed
- Shared mutable nested objects.

- Inner objects whose identity matters less than their field values.

## Example

### Before
```typescript
class TelephoneNumber {
  constructor(
    public areaCode: string,
    public number: string,
  ) {}
}

class Person {
  private _telephoneNumber = new TelephoneNumber("312", "555-0142");

  set officeAreaCode(value: string) {
    this._telephoneNumber.areaCode = value;
  }

  set officeNumber(value: string) {
    this._telephoneNumber.number = value;
  }
}
```

### After
```typescript
class TelephoneNumber {
  constructor(
    public readonly areaCode: string,
    public readonly number: string,
  ) {}

  equals(other: unknown) {
    return (
      other instanceof TelephoneNumber &&
      this.areaCode === other.areaCode &&
      this.number === other.number
    );
  }
}

class Person {
  private _telephoneNumber = new TelephoneNumber("312", "555-0142");

  set officeAreaCode(value: string) {
    this._telephoneNumber = new TelephoneNumber(value, this.officeNumber);
  }

  set officeNumber(value: string) {
    this._telephoneNumber = new TelephoneNumber(this.officeAreaCode, value);
  }

  get officeAreaCode() {
    return this._telephoneNumber.areaCode;
  }

  get officeNumber() {
    return this._telephoneNumber.number;
  }
}
```

## Mechanics
1. Check that the candidate class is immutable or can become immutable.

2. For each setter, apply Remove Setting Method.

3. Provide a value-based equality method that uses the fields of the value object.

## Notes
- Fowler says not to do this when several objects must share one updatable collaborator and see each other's changes.

- In languages with built-in equality hooks, you usually need to override the hash code generator as well.

- In the example, the parent object rewrites the whole nested object instead of mutating its internals.

- JavaScript has no built-in value equality hook for custom objects, so the book uses an explicit `equals` method.

- Tests should compare two separately created objects with the same values, not the same object reference.

- Extra tests for inequality, `null`, and non-matching types strengthen the value-object contract.

## Related Refactorings
- Remove Setting Method.
- Extract Class.
- Change Value to Reference.
