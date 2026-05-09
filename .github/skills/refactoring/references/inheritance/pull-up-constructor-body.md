# Pull Up Constructor Body

**Formerly:** — | **Inverse of:** —

## When to Use
Use this when subclass constructors repeat the same setup. Move
the shared statements into the superclass constructor so
initialization logic lives in one place.

## Code Smells Addressed
- Duplicated Code
- Repeated initialization logic

## Example

### Before
```typescript
class Party {}

class Employee extends Party {
  constructor(
    private name: string,
    private id: string,
    private monthlyCost: number,
  ) {
    super();
    this.name = name;
  }
}

class Department extends Party {
  constructor(
    private name: string,
    private staff: Employee[],
  ) {
    super();
    this.name = name;
  }
}
```

### After
```typescript
class Party {
  constructor(protected name: string) {}
}

class Employee extends Party {
  constructor(
    name: string,
    private id: string,
    private monthlyCost: number,
  ) {
    super(name);
  }
}

class Department extends Party {
  constructor(name: string, private staff: Employee[]) {
    super(name);
  }
}
```

## Mechanics
1. Create a constructor on the superclass if it does not already
   exist.

2. Make sure every subclass constructor calls the superclass
   constructor with super().

3. Use Slide Statements to move the common statements so they sit
   immediately after super().

4. Remove the shared statements from the subclasses and place them
   in the superclass constructor.

5. Pass any required values from the subclasses to the superclass
   constructor.

6. Test.

7. If common code cannot move to the top of the constructor, apply
   Extract Function and then Pull Up Method on that extracted
   logic.

## Notes
- Constructors have ordering rules, so you usually cannot treat
  them like ordinary methods.

- If the constructor becomes awkward to reshape, the book suggests
  considering Replace Constructor with Factory Function.

- Code that depends on subclass state being initialized must stay
  behind until you extract it into a separate method.

## Related Refactorings
- Slide Statements
- Extract Function
- Pull Up Method
- Replace Constructor with Factory Function
