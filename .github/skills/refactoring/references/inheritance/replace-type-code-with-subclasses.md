# Replace Type Code with Subclasses

**Formerly:** Subsumes Replace Type Code with State/Strategy | **Inverse of:** Remove Subclass

## When to Use
Use this when a type code drives conditional behavior or marks
data that exists only for certain variants. Replace the code with
subclasses so polymorphism carries the distinction.

## Code Smells Addressed
- Switch Statements
- Primitive Obsession

## Example

### Before
```typescript
class Employee {
  constructor(
    private name: string,
    private type: 'engineer' | 'salesman' | 'manager',
  ) {}

  get capitalizedType() {
    return this.type[0].toUpperCase() + this.type.slice(1);
  }

  toString() {
    return `${this.name} (${this.capitalizedType})`;
  }
}

function createEmployee(name: string, type: string) {
  return new Employee(name, type as any);
}
```

### After
```typescript
class Employee {
  constructor(protected name: string) {}

  get type() {
    throw new Error('Subclass responsibility');
  }

  toString() {
    return `${this.name} (${this.type})`;
  }
}

class Engineer extends Employee {
  get type() {
    return 'engineer';
  }
}

class Salesman extends Employee {
  get type() {
    return 'salesman';
  }
}

class Manager extends Employee {
  get type() {
    return 'manager';
  }
}

function createEmployee(name: string, type: string) {
  switch (type) {
    case 'engineer': return new Engineer(name);
    case 'salesman': return new Salesman(name);
    case 'manager': return new Manager(name);
    default: throw new Error(`Employee cannot be of type ${type}`);
  }
}
```

## Mechanics
1. Auto-encapsulate the type code so all access goes through
   accessors.

2. Pick one type code value and create a subclass for it.

3. Override the type-code accessor in that subclass so it returns
   the literal value.

4. Create selector logic that returns the right subclass. With
   direct inheritance, this is usually a factory made with Replace
   Constructor with Factory Function.

5. Test. If you are unsure the subclass is really in use,
   temporarily change its return value and watch a test fail, as
   Fowler does.

6. Repeat the same steps for each remaining type code value,
   testing after each move.

7. Remove the stored type-code field from the superclass once
   every case has a subclass.

8. Remove validation and constructor parameters that existed only
   for the old type code.

9. Use Replace Conditional with Polymorphism and Push Down Method
   on behavior that still switches on the type.

10. Delete the leftover type accessors when nothing uses them
    anymore.

## Notes
- Do not use direct subclassing if the object must change type
  over time. In that case, the book recommends indirect
  inheritance by first applying Replace Primitive with Object to
  the type code.

- Direct subclassing also fails when the class already needs
  inheritance for a different reason.

- Leaving an empty superclass for the type objects can still help
  because it makes the relationship explicit and gives you a home
  for shared behavior.

## Related Refactorings
- Replace Primitive with Object
- Replace Conditional with Polymorphism
- Push Down Method
- Replace Constructor with Factory Function
- Remove Subclass
