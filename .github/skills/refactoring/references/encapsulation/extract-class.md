# Extract Class

**Formerly:** — | **Inverse of:** Inline Class

## When to Use
Use this refactoring when one class carries responsibilities that would be clearer as two separate abstractions.
A split helps when a subset of fields and methods belong together, change together, or would be subclassed differently.

## Code Smells Addressed
- Large class
- Responsibilities that change for different reasons

## Example

### Before
```typescript
class Person {
  constructor(
    public name: string,
    public officeAreaCode: string,
    public officeNumber: string
  ) {}

  get telephoneNumber() {
    return `(${this.officeAreaCode}) ${this.officeNumber}`
  }

  setOfficeAreaCode(value: string) {
    this.officeAreaCode = value
  }

  setOfficeNumber(value: string) {
    this.officeNumber = value
  }
}

const martin = new Person('Martin', '312', '555-0142')
console.log(martin.telephoneNumber)
```

### After
```typescript
class TelephoneNumber {
  constructor(
    public areaCode: string,
    public number: string
  ) {}

  toString() {
    return `(${this.areaCode}) ${this.number}`
  }
}

class Person {
  private _telephoneNumber: TelephoneNumber

  constructor(
    public name: string,
    officeAreaCode: string,
    officeNumber: string
  ) {
    this._telephoneNumber = new TelephoneNumber(officeAreaCode, officeNumber)
  }

  get officeAreaCode() {
    return this._telephoneNumber.areaCode
  }

  set officeAreaCode(value: string) {
    this._telephoneNumber.areaCode = value
  }

  get officeNumber() {
    return this._telephoneNumber.number
  }

  get telephoneNumber() {
    return this._telephoneNumber.toString()
  }
}
```

## Mechanics
1. Decide how to divide the class responsibilities.
2. Create a new class for the extracted responsibility, and rename the old class if its old name no longer fits.
3. Create an instance of the new class in the original class and store it in a field.
4. Move the chosen fields with **Move Field**, testing after each move.
5. Move the chosen methods with **Move Function**, starting with the lower-level methods that are called by others.
6. Review the interfaces of both classes, then remove or rename methods to fit the new boundaries.
7. Decide whether to expose the new class. If you do, consider making it a value object.

## Notes
- Ask which fields and methods would become nonsense if one member disappeared. Tight clusters usually want their own class.
- A class becomes hard to understand when it has more than one clear reason to change.
- Start with the lowest-level behavior. Higher-level methods are easier to move after their dependencies move.
- Renaming often clarifies the split. New names show what each class now means.
- This refactoring frequently exposes a natural value object, such as a telephone number or postal address.

## Related Refactorings
- Move Field
- Move Function
- Inline Class
- Change Reference to Value
