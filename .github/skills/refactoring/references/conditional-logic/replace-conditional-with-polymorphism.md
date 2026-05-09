# Replace Conditional with Polymorphism

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when the same switching logic appears across a family of cases or when one base case has clear variants.
Fowler replaces the conditional with subtype behavior so each case lives beside its own logic.

## Code Smells Addressed
- Repeated `switch` or `if` logic on type codes.

- Variant behavior tangled into one large conditional function.

## Example

### Before
```typescript
function plumage(bird: {
  type: string;
  numberOfCoconuts?: number;
  voltage?: number;
}) {
  switch (bird.type) {
    case "EuropeanSwallow":
      return "average";
    case "AfricanSwallow":
      return bird.numberOfCoconuts! > 2 ? "tired" : "average";
    case "NorwegianBlueParrot":
      return bird.voltage! > 100 ? "scorched" : "beautiful";
    default:
      return "unknown";
  }
}
```

### After
```typescript
class Bird {
  constructor(protected readonly data: Record<string, unknown>) {}

  get plumage() {
    return "unknown";
  }
}

class EuropeanSwallow extends Bird {
  get plumage() {
    return "average";
  }
}

class AfricanSwallow extends Bird {
  get plumage() {
    return (this.data.numberOfCoconuts as number) > 2 ? "tired" : "average";
  }
}

class NorwegianBlueParrot extends Bird {
  get plumage() {
    return (this.data.voltage as number) > 100 ? "scorched" : "beautiful";
  }
}

function createBird(bird: { type: string } & Record<string, unknown>) {
  switch (bird.type) {
    case "EuropeanSwallow":
      return new EuropeanSwallow(bird);
    case "AfricanSwallow":
      return new AfricanSwallow(bird);
    case "NorwegianBlueParrot":
      return new NorwegianBlueParrot(bird);
    default:
      return new Bird(bird);
  }
}
```

## Mechanics
1. If classes do not exist for polymorphic behavior, create them together with a factory function to return the correct instance.

2. Use the factory function in calling code.

3. Move the conditional function to the superclass.

4. If the conditional logic is not a self-contained function, use Extract Function to make it so.

5. Pick one subclass, create an overriding method, copy that leg of the conditional into it, and adjust it to fit.

6. Repeat for each leg of the conditional.

7. Leave a default case in the superclass method, or make the superclass abstract and signal that a subclass must implement it.

## Notes
- Fowler shows two shapes of this refactoring: explicit type codes and a base case with variants.

- In the birds example, he first uses Combine Functions into Class before introducing subclasses.

- In the rating example, he extracts a helper method before moving only the variant behavior into the subclass.

- He keeps a superclass in JavaScript even though duck typing would work, because the hierarchy explains the domain.

- A helper name that contains `And` often signals that more extraction is still needed.

## Related Refactorings
- Extract Function.
- Combine Functions into Class.
- Inline Function.
- Move Statements to Callers.
- Rename Function.
