# Encapsulate Variable

**Formerly:** Self-Encapsulate Field, Encapsulate Field | **Inverse of:** —

## When to Use
Use this refactoring when too much code can reach a variable directly.
It helps when you need to control updates, add validation, return defensive copies, or reduce coupling around shared data.

## Code Smells Addressed
- Global data
- Public field with uncontrolled access

## Example

### Before
```typescript
let defaultOwner = {
  firstName: "Martin",
  lastName: "Fowler",
}

function spaceshipOwner() {
  return defaultOwner
}

defaultOwner = {
  firstName: "Rebecca",
  lastName: "Parsons",
}

spaceshipOwner().firstName = "Changed from outside"
```

### After
```typescript
let defaultOwnerData = {
  firstName: "Martin",
  lastName: "Fowler",
}

function getDefaultOwner() {
  return { ...defaultOwnerData }
}

function setDefaultOwner(newOwner: Person) {
  defaultOwnerData = { ...newOwner }
}

function spaceshipOwner() {
  return getDefaultOwner()
}

type Person = {
  firstName: string
  lastName: string
}

setDefaultOwner({ firstName: "Rebecca", lastName: "Parsons" })
console.log(spaceshipOwner().firstName)
```

## Mechanics
1. Create functions to read and update the variable.
   Start with a getter and, when needed, a setter.
2. Run static checks.
   Let the tooling catch direct references you may have missed.
3. Replace each direct use of the variable with a call to the new access function.
   Test after each replacement or small group of replacements.
4. Restrict the visibility of the variable itself.
   Make direct access impossible outside the owning module or class.
5. Test.
   Confirm all clients now go through the encapsulation boundary.
6. If the variable holds a record, consider Encapsulate Record next.
   Fowler often deepens the boundary once the access point exists.

## Notes
- Returning a mutable record directly can defeat the whole refactoring.
- The book shows defensive copies as one way to prevent outside mutation.
- Immutable data reduces the need for deep encapsulation, but access control can still help.
- Encapsulation makes later changes to storage shape much safer.
- This refactoring is especially valuable for module-level and global variables.
- Getter and setter names should reflect the domain when possible.
- Encapsulate Variable often prepares the way for renaming or replacing the data structure.

## Related Refactorings
- Rename Variable
- Encapsulate Record
- Change Function Declaration
- Combine Functions into Class
