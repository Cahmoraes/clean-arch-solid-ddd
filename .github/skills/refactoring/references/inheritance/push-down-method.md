# Push Down Method

**Formerly:** — | **Inverse of:** Pull Up Method

## When to Use
Use this when a method on the superclass matters only to some
subclasses. Move it down so the superclass exposes only behavior
that is truly common.

## Code Smells Addressed
- Refused Bequest
- Speculative Generality

## Example

### Before
```typescript
class Employee {
  get quota() {
    return 100;
  }
}

class Salesperson extends Employee {
  commissionRate() {
    return this.quota > 50 ? 0.1 : 0.05;
  }
}

class Engineer extends Employee {
  specialty() {
    return 'platform';
  }
}
```

### After
```typescript
class Employee {}

class Salesperson extends Employee {
  get quota() {
    return 100;
  }

  commissionRate() {
    return this.quota > 50 ? 0.1 : 0.05;
  }
}

class Engineer extends Employee {
  specialty() {
    return 'platform';
  }
}
```

## Mechanics
1. Copy the method into each subclass that needs it.

2. Remove the method from the superclass.

3. Test.

4. Delete the method from any subclass that does not need it.

5. Test again.

## Notes
- This works only when callers know they are working with the
  specific subclass that owns the behavior.

- If callers still depend on the superclass interface, the book
  suggests replacing the conditional with polymorphism instead of
  removing the method there.

- Push the method only after you confirm that the superclass is no
  longer the right abstraction for it.

## Related Refactorings
- Pull Up Method
- Replace Conditional with Polymorphism
- Push Down Field
