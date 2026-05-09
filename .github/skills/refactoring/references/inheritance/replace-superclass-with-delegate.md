# Replace Superclass with Delegate

**Formerly:** Replace Inheritance with Delegation | **Inverse of:** Extract Superclass

## When to Use
Use this when the subclass does not truly satisfy the superclass
contract, or when the inheritance relation confuses the model.
Replace the inheritance link with a delegate field so only the
needed behavior carries over.

## Code Smells Addressed
- Refused Bequest
- Type-Instance Homonym

## Example

### Before
```typescript
class CatalogItem {
  constructor(
    private idValue: string,
    private titleValue: string,
    private tags: string[],
  ) {}

  get id() {
    return this.idValue;
  }

  get title() {
    return this.titleValue;
  }

  hasTag(tag: string) {
    return this.tags.includes(tag);
  }
}

class Scroll extends CatalogItem {
  constructor(
    id: string,
    title: string,
    tags: string[],
    private lastCleaned: Date,
  ) {
    super(id, title, tags);
  }
}
```

### After
```typescript
class CatalogItem {
  constructor(
    private idValue: string,
    private titleValue: string,
    private tags: string[],
  ) {}

  get id() {
    return this.idValue;
  }

  get title() {
    return this.titleValue;
  }

  hasTag(tag: string) {
    return this.tags.includes(tag);
  }
}

class Scroll {
  private catalogItem: CatalogItem;

  constructor(
    private idValue: string,
    title: string,
    tags: string[],
    private lastCleaned: Date,
  ) {
    this.catalogItem = new CatalogItem(idValue, title, tags);
  }

  get id() {
    return this.idValue;
  }

  get title() {
    return this.catalogItem.title;
  }

  hasTag(tag: string) {
    return this.catalogItem.hasTag(tag);
  }
}
```

## Mechanics
1. Create a field in the subclass that refers to a superclass
   object.

2. Initialize that delegate field with a new instance.

3. For each superclass element, add a forwarding function on the
   subclass that delegates to the field.

4. Test after each consistent group of forwarders. For example,
   move a getter and setter pair together before testing.

5. When every needed superclass element has a forwarding function,
   remove the inheritance link.

## Notes
- Fowler uses the stack-versus-list example to show the classic
  misuse: the stack inherits many list operations that do not
  belong on a stack at all.

- He also calls out the type-instance homonym problem, where a
  physical object is modeled as a subtype of the class that
  describes its type.

- After the basic refactoring, you may discover that the delegate
  should be shared rather than copied. The scroll example
  continues with Change Value to Reference for that reason.

- Forwarding methods are tedious, but the book treats them as safe
  because they are simple and explicit.

## Related Refactorings
- Change Value to Reference
- Change Function Declaration
- Extract Superclass
- Replace Subclass with Delegate
