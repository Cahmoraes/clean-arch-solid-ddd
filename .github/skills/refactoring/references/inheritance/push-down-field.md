# Push Down Field

**Formerly:** — | **Inverse of:** Pull Up Field

## When to Use
Use this when a field declared on the superclass is meaningful
only for certain subclasses. Move it down so the superclass stops
carrying state that most instances never use.

## Code Smells Addressed
- Refused Bequest
- Speculative Generality

## Example

### Before
```typescript
class Employee {
  protected quota = 100;
}

class Salesperson extends Employee {
  bonus() {
    return this.quota * 10;
  }
}

class Engineer extends Employee {
  level() {
    return 'senior';
  }
}
```

### After
```typescript
class Employee {}

class Salesperson extends Employee {
  protected quota = 100;

  bonus() {
    return this.quota * 10;
  }
}

class Engineer extends Employee {
  level() {
    return 'senior';
  }
}
```

## Mechanics
1. Declare the field in every subclass that needs it.

2. Remove the field from the superclass.

3. Test.

4. Delete the field from any subclass that does not need it.

5. Test again.

## Notes
- The book keeps the mechanics short because this move is a direct
  mirror of Pull Up Field.

- Once the field lives only where it belongs, you can often follow
  with Push Down Method on behavior that uses it.

- Do not leave the field on the superclass as a convenience. That
  keeps the hierarchy misleading.

- After the move, review the superclass constructor and accessors.
  They may now contain dead support code for the old field.

## Related Refactorings
- Pull Up Field
- Push Down Method
- Replace Type Code with Subclasses
