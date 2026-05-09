# Remove Subclass

**Formerly:** Replace Subclass with Fields | **Inverse of:** Replace Type Code with Subclasses

## When to Use
Use this when a subclass no longer earns its keep. If the
variation it represented has vanished or shrunk to a trivial
difference, replace the subclass with data on the superclass.

## Code Smells Addressed
- Speculative Generality
- Lazy Class

## Example

### Before
```typescript
class Person {
  constructor(private name: string) {}

  get genderCode() {
    return 'X';
  }
}

class Male extends Person {
  get genderCode() {
    return 'M';
  }
}

class Female extends Person {
  get genderCode() {
    return 'F';
  }
}
```

### After
```typescript
class Person {
  constructor(
    private name: string,
    private genderCodeValue: 'M' | 'F' | 'X' = 'X',
  ) {}

  get genderCode() {
    return this.genderCodeValue;
  }

  get isMale() {
    return this.genderCodeValue === 'M';
  }
}

function createPerson(record: { name: string; gender: 'M' | 'F' | 'X' }) {
  return new Person(record.name, record.gender ?? 'X');
}
```

## Mechanics
1. Apply Replace Constructor with Factory Function to the subclass
   constructor.

2. If constructor clients use data to choose which subclass to
   build, move that decision into a superclass factory function.

3. If any client tests subclass types, use Extract Function on
   that type test and then Move Function so the knowledge lives on
   the superclass.

4. Create a field on the superclass that represents the old
   subclass distinction.

5. Change methods that referred to the subclass so they use the
   new field instead.

6. Delete the subclass.

7. Test.

## Notes
- Fowler checks client code for subclass-dependent behavior before
  deleting the subclasses. If useful behavior remains, keep the
  subclasses.

- When you remove several subclasses, first encapsulate
  construction and type tests for all of them. Then fold them back
  one by one.

- The running example keeps an explicit default code of X to make
  the resulting model symmetrical and clear.

## Related Refactorings
- Replace Constructor with Factory Function
- Extract Function
- Move Function
- Replace Type Code with Subclasses
