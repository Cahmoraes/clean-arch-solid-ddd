# Remove Setting Method

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a field should not change after the object is
created.
Move initialization into construction so the API states that later updates do
not make sense.

## Code Smells Addressed
- A setter that suggests mutability for a field that should stay fixed.

- Creation scripts that use setters only during object construction.

## Example

### Before
```typescript
class Person {
  private _id = "";
  private _name = "";

  get id() {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
  }

  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }
}

const martin = new Person();
martin.id = "1234";
martin.name = "Martin";
```

### After
```typescript
class Person {
  private readonly _id: string;
  private _name = "";

  constructor(id: string) {
    this._id = id;
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }
}

const martin = new Person("1234");
martin.name = "Martin";
```

## Mechanics
1. If the constructor does not already receive the value, use Change
   Function Declaration to add it and call the setter from the constructor.

2. If you plan to remove several setters, add all of their values to the
   constructor in one pass.

3. Remove each setter call outside the constructor and use the new
   constructor argument instead. Test after each change.

4. If you cannot replace a setter call by creating a new object because you
   must update a shared reference, stop and abandon the refactoring.

5. Inline the setting method. Make the field immutable if you can.

6. Test.

## Notes
- Fowler highlights two common sources: constructors that call setters for
  everything and creation scripts that build objects through a sequence of
  setter calls.

- Keep setters for fields that truly change after construction. The example
  keeps `name` mutable and removes only `id`.

- The payoff is clarity as much as safety. The class now says which fields
  may change and which may not.

- Making the field immutable often removes the possibility of accidental
  later updates, not just the suggestion of them.

## Related Refactorings
- Change Function Declaration

- Inline Function
