# Replace Function with Command

**Formerly:** Replace Method with Method Object | **Inverse of:** Replace Command with Function

## When to Use
Use this refactoring when a plain function needs more structure than a simple
call can provide.
Wrap it in a command object when you need a richer lifecycle, helper methods
with shared state, undo-like behavior, or easier decomposition of complex
logic.

## Code Smells Addressed
- A complex function that is hard to break apart because locals and scopes
  are tangled.

- Behavior that needs more control than a plain function call can express.

## Example

### Before
```typescript
function score(candidate: Candidate, exam: MedicalExam, guide: ScoringGuide) {
  let result = 0;
  let healthLevel = 0;

  if (exam.isSmoker) {
    healthLevel += 10;
  }

  if (guide.stateWithLowCertification(candidate.originState)) {
    result -= 5;
  }

  result -= Math.max(healthLevel - 5, 0);
  return result;
}
```

### After
```typescript
function score(candidate: Candidate, exam: MedicalExam, guide: ScoringGuide) {
  return new Scorer(candidate, exam, guide).execute();
}

class Scorer {
  constructor(
    private readonly candidate: Candidate,
    private readonly exam: MedicalExam,
    private readonly guide: ScoringGuide,
  ) {}

  execute() {
    let result = 0;
    let healthLevel = 0;

    if (this.exam.isSmoker) {
      healthLevel += 10;
    }

    if (this.guide.stateWithLowCertification(this.candidate.originState)) {
      result -= 5;
    }

    result -= Math.max(healthLevel - 5, 0);
    return result;
  }
}
```

## Mechanics
1. Create an empty class for the function and name it after the function.

2. Use Move Function to move the function into that class.

3. Keep the original function as a forwarding function until at least the
   end of the refactoring.

4. Follow the language's command naming convention. If none exists, use a
   generic execution name such as `execute` or `call`.

5. Consider turning each argument into a field and moving those arguments to
   the constructor.

## Notes
- Fowler still prefers a plain function most of the time. He reaches for a
  command only when simpler options cannot provide what he needs.

- Commands can support extra operations, such as undo, staged parameter
  setup, inheritance hooks, and queued execution.

- Once arguments and locals become fields, you can extract helper methods
  without fighting variable scope.

- In JavaScript, nested functions can sometimes play a similar role, but the
  command object makes direct testing and debugging of substeps easier.

## Related Refactorings
- Move Function

- Replace Command with Function
