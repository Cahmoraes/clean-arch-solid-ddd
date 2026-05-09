# Extract Superclass

**Formerly:** — | **Inverse of:** Collapse Hierarchy

## When to Use
Use this when two classes share data or behavior and deserve a
common abstraction. Create the superclass after the similarity
appears, not because you guessed it up front.

## Code Smells Addressed
- Duplicated Code
- Repeated state across similar classes

## Example

### Before
```typescript
class Employee {
  constructor(
    private name: string,
    private monthlyCost: number,
  ) {}

  get annualCost() {
    return this.monthlyCost * 12;
  }
}

class Department {
  constructor(
    private name: string,
    private monthlyCost: number,
  ) {}

  get annualCost() {
    return this.monthlyCost * 12;
  }
}
```

### After
```typescript
abstract class Party {
  constructor(protected name: string) {}

  abstract get monthlyCost(): number;

  get annualCost() {
    return this.monthlyCost * 12;
  }
}

class Employee extends Party {
  constructor(name: string, private _monthlyCost: number) {
    super(name);
  }

  get monthlyCost() {
    return this._monthlyCost;
  }
}

class Department extends Party {
  constructor(name: string, private _monthlyCost: number) {
    super(name);
  }

  get monthlyCost() {
    return this._monthlyCost;
  }
}
```

## Mechanics
1. Create an empty superclass and make the original classes
   inherit from it.

2. If necessary, use Change Function Declaration on the
   constructors.

3. Test.

4. One by one, use Pull Up Constructor Body, Pull Up Method, and
   Pull Up Field to move common features to the superclass.

5. Look at what remains in the subclasses. If they still share
   fragments, use Extract Function and then Pull Up Method.

6. Review client code and consider changing it to use the
   superclass interface.

## Notes
- This refactoring often discovers inheritance during evolution.
  It does not require inheritance to exist first.

- Extract Class is the main alternative when you prefer
  composition over inheritance.

- The book treats Replace Superclass with Delegate as the escape
  hatch if the new superclass later proves too rigid.

## Related Refactorings
- Pull Up Constructor Body
- Pull Up Method
- Pull Up Field
- Extract Class
- Replace Superclass with Delegate
