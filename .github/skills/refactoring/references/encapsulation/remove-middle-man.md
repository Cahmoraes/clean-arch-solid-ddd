# Remove Middle Man

**Formerly:** — | **Inverse of:** Hide Delegate

## When to Use
Use this refactoring when a server class has accumulated too many simple delegating methods.
Letting clients talk to the real delegate directly can shrink the server interface and remove pointless forwarding code.

## Code Smells Addressed
- Middle man
- Bloated interface of pass-through methods

## Example

### Before
```typescript
class Department {
  constructor(
    public manager: string,
    public budgetCode: string
  ) {}
}

class Person {
  constructor(private _department: Department) {}

  get manager() {
    return this._department.manager
  }

  get budgetCode() {
    return this._department.budgetCode
  }
}

const martin = new Person(new Department('Rita', 'ENG-01'))
console.log(martin.manager)
console.log(martin.budgetCode)
```

### After
```typescript
class Department {
  constructor(
    public manager: string,
    public budgetCode: string
  ) {}
}

class Person {
  constructor(private _department: Department) {}

  get department() {
    return this._department
  }
}

const martin = new Person(new Department('Rita', 'ENG-01'))
console.log(martin.department.manager)
console.log(martin.department.budgetCode)
```

## Mechanics
1. Add a getter for the delegate object on the server.
2. Replace each call to a delegating method with a direct call through the new getter, testing after each replacement.
3. Delete a delegating method once all clients stop using it.
4. As an automated alternative, apply **Encapsulate Variable** to the delegate field and then **Inline Function** on the delegators.

## Notes
- Fowler treats the Law of Demeter as useful guidance, not a rule you follow at all costs.
- Keep convenience delegators only when they truly help clients. Remove the rest.
- This refactoring is the escape hatch when **Hide Delegate** goes too far.
- Client code will know more about the object graph after this change. Accept that only when the trade-off is worth it.
- Automated refactoring support can make the inline path faster than a manual migration.

## Related Refactorings
- Hide Delegate
- Encapsulate Variable
- Inline Function
- Extract Class
