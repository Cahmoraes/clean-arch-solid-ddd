# Substitute Algorithm

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when you find a clearer or easier-to-change way to compute the same result.
It is also useful when a library function or a better understanding of the problem suggests a simpler algorithm.

## Code Smells Addressed
- Overcomplicated algorithm
- Hard-to-change logic in one function

## Example

### Before
```typescript
function foundPerson(people: string[]) {
  for (let i = 0; i < people.length; i += 1) {
    const currentPerson = people[i]

    if (currentPerson === 'Don') {
      return 'Don'
    }

    if (currentPerson === 'John') {
      return 'John'
    }

    if (currentPerson === 'Kent') {
      return 'Kent'
    }
  }

  return ''
}

const attendees = ['Alice', 'Kent', 'Bob']
const result = foundPerson(attendees)
console.log(result)
```

### After
```typescript
function foundPerson(people: string[]) {
  const candidates = ['Don', 'John', 'Kent']
  const preferredPeople = new Set(candidates)
  const match = people.find(person => preferredPeople.has(person))

  if (!match) {
    return ''
  }

  return match
}

const attendees = ['Alice', 'Kent', 'Bob']
const result = foundPerson(attendees)
console.log(result)
```

## Mechanics
1. Arrange the code so the algorithm you want to replace fills one whole function.
2. Write tests that exercise only that function and capture its current behavior.
3. Prepare the replacement algorithm.
4. Run static checks.
5. Run the tests. If the new algorithm matches the old behavior, keep it. If not, use the old version as the comparison point while you debug the new one.

## Notes
- Do not try to swap a huge tangled algorithm in one step. Isolate it first.
- Tests are the safety net here. Without them, you are guessing about behavior.
- The new algorithm may come from a library, a language feature, or a cleaner insight into the problem.
- The goal is the same result with a simpler implementation.
- This refactoring often follows **Extract Function**, because isolation makes substitution possible.
- A direct swap is practical only after you have made the old algorithm small enough to understand.
- Keep the old implementation around until the tests prove the replacement is equivalent.
- Favor the algorithm that makes the next change easier, not just the one with fewer lines.

## Related Refactorings
- Extract Function
- Replace Temp with Query
- Inline Function
- Split Loop
