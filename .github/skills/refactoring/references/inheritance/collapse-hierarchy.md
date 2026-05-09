# Collapse Hierarchy

**Formerly:** — | **Inverse of:** Extract Superclass

## When to Use
Use this when a class and its parent are no longer different
enough to justify a hierarchy. Merge them so the code reflects the
simpler model.

## Code Smells Addressed
- Speculative Generality
- Lazy Class

## Example

### Before
```typescript
class Employee {
  constructor(readonly name: string) {}

  annualReview() {
    return `${this.name}: standard review`;
  }
}

class Salesperson extends Employee {
  // no distinct state or behavior remains
}

const staff: Employee[] = [new Salesperson('Mina')];
```

### After
```typescript
class Employee {
  constructor(readonly name: string) {}

  annualReview() {
    return `${this.name}: standard review`;
  }
}

const staff: Employee[] = [new Employee('Mina')];
```

## Mechanics
1. Choose which class to remove.

2. Base that choice on which name will make more sense in the
   future. If neither wins, choose arbitrarily.

3. Use Pull Up Field, Push Down Field, Pull Up Method, and Push
   Down Method to move every element into the class that will
   stay.

4. Adjust all references to the class you are removing so they
   point to the surviving class.

5. Remove the empty class.

6. Test.

## Notes
- The book keeps this refactoring deliberately small because it is
  usually the last tidy-up step after many pulls and pushes.

- Do not keep both names around. The point is to remove the false
  distinction from the model.

- Choose the surviving name for tomorrow’s code, not for the
  current inheritance shape.

- You usually reach this refactoring after other pull-up and
  push-down moves have already erased the old distinction.

## Related Refactorings
- Pull Up Method
- Push Down Method
- Pull Up Field
- Push Down Field
- Extract Superclass
