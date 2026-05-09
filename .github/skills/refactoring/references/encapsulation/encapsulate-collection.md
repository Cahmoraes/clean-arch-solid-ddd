# Encapsulate Collection

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a class exposes a collection and callers can add or remove items without the class knowing it.
Move all mutation through methods on the owning class so the class keeps control of its invariants.

## Code Smells Addressed
- Exposed mutable collection
- Hidden updates outside the owning class

## Example

### Before
```typescript
class Person {
  private _courses: string[] = []

  get courses() {
    return this._courses
  }
}

const martin = new Person()
martin.courses.push('refactoring')
martin.courses.push('domain-driven design')

function dropCourse(person: Person, course: string) {
  const index = person.courses.indexOf(course)
  if (index >= 0) {
    person.courses.splice(index, 1)
  }
}

dropCourse(martin, 'refactoring')
console.log(martin.courses.join(', '))
```

### After
```typescript
class Person {
  private _courses: string[] = []

  get courses() {
    return this._courses.slice()
  }

  addCourse(course: string) {
    this._courses.push(course)
  }

  removeCourse(course: string) {
    const index = this._courses.indexOf(course)
    if (index >= 0) {
      this._courses.splice(index, 1)
    }
  }
}

const martin = new Person()
martin.addCourse('refactoring')
martin.addCourse('domain-driven design')
martin.removeCourse('refactoring')

console.log(martin.courses.join(', '))
```

## Mechanics
1. Apply **Encapsulate Variable** if the collection reference is still public.
2. Add `add` and `remove` methods on the owning class for the collection elements.
3. If a setter exists, remove it with **Remove Setting Method** when you can.
4. If you must keep the setter, make it store a copy of the incoming collection instead of the original reference.
5. Run static checks.
6. Replace every direct mutation on the collection with calls to the new `add` and `remove` methods.
7. Change the getter to return a protected view, usually a copy in JavaScript or TypeScript.
8. Test.

## Notes
- In JavaScript, `sort()` mutates the original array. Returning a copy avoids surprising shared updates.
- A copy is often simpler than building a read-only proxy in JavaScript.
- Keep one policy across the codebase. Mixed patterns make collection access harder to reason about.
- The key point is control over mutation, not hiding the fact that a collection exists.
- This refactoring often exposes missing domain operations such as `addCourse` or `removeCourse`.

## Related Refactorings
- Encapsulate Variable
- Remove Setting Method
- Hide Delegate
- Extract Function
