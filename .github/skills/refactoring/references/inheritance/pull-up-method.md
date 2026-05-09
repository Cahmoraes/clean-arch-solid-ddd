# Pull Up Method

**Formerly:** — | **Inverse of:** Push Down Method

## When to Use
Use this when sibling subclasses implement the same method body.
Move the method to the superclass so one place owns the behavior
and future changes stay consistent.

## Code Smells Addressed
- Duplicated Code
- Repeated behavior across sibling subclasses

## Example

### Before
```typescript
class Party {}

class Employee extends Party {
  constructor(private monthlyCost: number) {
    super();
  }

  get annualCost() {
    return this.monthlyCost * 12;
  }
}

class Department extends Party {
  constructor(private monthlyCost: number) {
    super();
  }

  get annualCost() {
    return this.monthlyCost * 12;
  }
}
```

### After
```typescript
class Party {
  constructor(protected monthlyCost: number) {}

  get annualCost() {
    return this.monthlyCost * 12;
  }
}

class Employee extends Party {
  constructor(monthlyCost: number) {
    super(monthlyCost);
  }
}

class Department extends Party {
  constructor(monthlyCost: number) {
    super(monthlyCost);
  }
}
```

## Mechanics
1. Inspect the methods and confirm that they do the same thing.

2. If they do the same job but are not identical, refactor them
   until the method bodies match.

3. Check that every name the method uses exists on the superclass.

4. If the signatures differ, apply Change Function Declaration
   until they match.

5. Create the method on the superclass and copy one method body
   into it.

6. Run static checks.

7. Delete the method from one subclass and test.

8. Repeat until the method is gone from every subclass that shared
   it.

## Notes
- If the method body uses fields or helpers that exist only on the
  subclass, pull those members up first.

- In a statically typed language, the superclass may need an
  abstract declaration before you move the implementation.

- If the methods stay similar but cannot become identical, use
  Form Template Method instead of forcing the move.

## Related Refactorings
- Pull Up Field
- Change Function Declaration
- Form Template Method
- Push Down Method
