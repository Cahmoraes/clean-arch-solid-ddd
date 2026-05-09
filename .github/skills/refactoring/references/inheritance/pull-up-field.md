# Pull Up Field

**Formerly:** — | **Inverse of:** Push Down Field

## When to Use
Use this when sibling subclasses carry the same field for the same
purpose. Move it to the superclass so the shared state is declared
once and the hierarchy reads cleanly.

## Code Smells Addressed
- Duplicated Code
- Repeated state across sibling subclasses

## Example

### Before
```typescript
class Employee {}

class Salesperson extends Employee {
  protected name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

class Engineer extends Employee {
  protected name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
```

### After
```typescript
class Employee {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }
}

class Salesperson extends Employee {
  constructor(name: string) {
    super(name);
  }
}

class Engineer extends Employee {
  constructor(name: string) {
    super(name);
  }
}
```

## Mechanics
1. Inspect every use of the candidate field and confirm that the
   subclasses use it in the same way.

2. If the fields have different names, apply Rename Field until
   the hierarchy uses one name.

3. Create the field on the superclass.

4. In a statically typed language, give it protected visibility if
   subclasses need direct access.

5. Delete the field declarations from the subclasses.

6. Test.

## Notes
- This refactoring often opens the door for Pull Up Method because
  shared methods can now reference the shared field in the
  superclass.

- In JavaScript and TypeScript without explicit field
  declarations, the field effectively appears where the
  constructor assigns it.

- If the duplication lives only in constructor assignments, Pull
  Up Constructor Body may do most of the work.

## Related Refactorings
- Pull Up Constructor Body
- Rename Field
- Push Down Field
