# Replace Constructor with Factory Function

**Formerly:** Replace Constructor with Factory Method | **Inverse of:** —

## When to Use
Use this refactoring when a constructor call is too rigid, too awkwardly
named, or too tied to the `new` operator.
Introduce a factory function so object creation can carry a clearer name and
later return something other than the raw class.

## Code Smells Addressed
- Constructor calls whose names do not explain the role of the object being
  created.

- Construction that leaks literals, such as type codes, into callers.

## Example

### Before
```typescript
class Employee {
  constructor(
    private readonly name: string,
    private readonly typeCode: string,
  ) {}
}

const leadEngineer = new Employee(document.leadEngineer, "E");
```

### After
```typescript
class Employee {
  constructor(
    private readonly name: string,
    private readonly typeCode: string,
  ) {}
}

function createEngineer(name: string) {
  return new Employee(name, "E");
}

const leadEngineer = createEngineer(document.leadEngineer);
```

## Mechanics
1. Create a factory function whose body calls the constructor.

2. Replace each constructor call with a call to the factory function. Test
   after each change.

3. Reduce the constructor's visibility as far as the language allows.

## Notes
- A factory function may delegate to the constructor today and return a
  subclass or proxy later.

- In languages with stricter constructor rules, a constructor must return an
  instance of its own class, while a factory has no such limit.

- Factory names are not locked to the class name, so they can say what role
  the caller wants instead of how construction happens.

- Constructors often need a special operator such as `new`. A factory can be
  passed around like any ordinary function.

- The book's example starts with a general factory and then introduces a
  more specific one, `createEngineer`, to bury the type code in the name.

- Factory functions also fit places that expect ordinary functions better
  than constructors do.

- After the callers move over, hide the constructor as much as the language
  allows so the factory becomes the normal entry point.

## Related Refactorings
- Remove Setting Method

- Change Function Declaration
