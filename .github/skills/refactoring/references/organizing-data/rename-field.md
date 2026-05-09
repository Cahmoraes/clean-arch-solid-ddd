# Rename Field

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a field name no longer matches the domain you now understand.
Fowler stresses that data structures shape how readers understand a program, so field names must stay clear.

## Code Smells Addressed
- Misleading field names in widely used data structures.

- Domain language in code that has drifted from current understanding.

## Example

### Before
```typescript
class Organization {
  private _name: string;
  private _country: string;

  constructor(data: { name: string; country: string }) {
    this._name = data.name;
    this._country = data.country;
  }

  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }
}
```

### After
```typescript
class Organization {
  private _title: string;
  private _country: string;

  constructor(data: { title: string; country: string }) {
    this._title = data.title;
    this._country = data.country;
  }

  get title() {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }
}
```

## Mechanics
1. If the record has limited scope, rename all accesses to the field and test; you do not need the rest of the mechanics.

2. If the record is not already encapsulated, apply Encapsulate Record.

3. Rename the private field inside the object, and adjust internal methods to fit.

4. Test.

5. If the constructor uses the name, apply Change Function Declaration to rename it.

6. Apply Rename Function to the accessors.

## Notes
- Fowler uses the full, gradual process for data structures that are widely used and mutable.

- Encapsulation creates smaller, safer steps because you can change constructor, storage, getters, and setters independently.

- In the book's example, the constructor temporarily accepts both `name` and `title`, with `title` taking precedence.

- Once every caller uses the new name, remove support for the old one.

- If the data is immutable, Fowler suggests copying the value to the new name, migrating callers gradually, and then removing the old name.

## Related Refactorings
- Encapsulate Record.
- Change Function Declaration.
- Rename Function.
