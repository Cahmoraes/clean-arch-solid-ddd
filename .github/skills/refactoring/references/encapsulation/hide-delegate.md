# Hide Delegate

**Formerly:** — | **Inverse of:** Remove Middle Man

## When to Use
Use this refactoring when clients reach through one object to another, such as `person.department.manager`.
Adding a delegating method on the server reduces how much the client must know about the object graph.

## Code Smells Addressed
- Message chains
- Client knowledge of internal relationships

## Example

### Before
```typescript
class Department {
  constructor(public manager: string) {}
}

class Person {
  constructor(
    public name: string,
    public department: Department
  ) {}
}

const martin = new Person(
  'Martin',
  new Department('Rita')
)

function managerName(person: Person) {
  return person.department.manager
}

console.log(managerName(martin))
```

### After
```typescript
class Department {
  constructor(public manager: string) {}
}

class Person {
  constructor(
    public name: string,
    private _department: Department
  ) {}

  get manager() {
    return this._department.manager
  }
}

const martin = new Person(
  'Martin',
  new Department('Rita')
)

function managerName(person: Person) {
  return person.manager
}

console.log(managerName(martin))
```

## Mechanics
1. For each delegate method that clients call, add a simple delegating method on the server.
2. Change each client to call the server instead of the delegate, testing after each change.
3. If no client needs the delegate directly anymore, remove the delegate accessor from the server.
4. Test.

## Notes
- The core benefit is reduced coupling. A change to the delegate interface affects fewer callers.
- This refactoring follows the chapter theme: modules should know as little about each other as practical.
- Do not overdo it. Too many pass-through methods turn the server into a middle man.
- The right balance changes over time. Revisit the decision when the code shifts.
- This is a direct response to message chains.

## Related Refactorings
- Remove Middle Man
- Move Function
- Encapsulate Variable
- Extract Function
