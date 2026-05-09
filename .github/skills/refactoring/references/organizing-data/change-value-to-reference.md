# Change Value to Reference

**Formerly:** — | **Inverse of:** Change Reference to Value

## When to Use
Use this refactoring when many objects hold separate copies of one logical entity and updates must stay synchronized.
Fowler introduces a repository so every host object can point to one shared instance.

## Code Smells Addressed
- Multiple copies of the same logical entity.

- Inconsistent updates across duplicated records.

## Example

### Before
```typescript
class Customer {
  constructor(public readonly id: string) {}
}

class Order {
  private _customer: Customer;

  constructor(data: { number: string; customer: string }) {
    this._customer = new Customer(data.customer);
  }

  get customer() {
    return this._customer;
  }
}
```

### After
```typescript
class Customer {
  constructor(public readonly id: string) {}
}

const customers = new Map<string, Customer>();

function registerCustomer(id: string) {
  if (!customers.has(id)) {
    customers.set(id, new Customer(id));
  }
  return customers.get(id)!;
}

class Order {
  private _customer: Customer;

  constructor(data: { number: string; customer: string }) {
    this._customer = registerCustomer(data.customer);
  }

  get customer() {
    return this._customer;
  }
}
```

## Mechanics
1. Create a repository for instances of the related object, if one is not already present.

2. Ensure the constructor has a way of looking up the correct instance of the related object.

3. Change the constructors for the host object to use the repository to obtain the related object. Test after each change.

## Notes
- Fowler reaches for this refactoring when the copied entity may need enrichment or other updates later.

- The repository guarantees that one logical ID maps to one shared object.

- Sometimes the repository already exists, so the work starts at the constructor call sites.

- Another common variant loads all entities into the repository first and treats a missing ID as an error.

- The example uses a global repository for simplicity, but Fowler warns that globals should be used with care and can be passed in explicitly if needed.

## Related Refactorings
- Change Reference to Value.
