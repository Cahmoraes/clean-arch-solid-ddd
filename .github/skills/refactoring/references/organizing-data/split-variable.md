# Split Variable

**Formerly:** Remove Assignments to Parameters; Split Temp | **Inverse of:** —

## When to Use
Use this refactoring when one variable holds two meanings in the same function.
Fowler says a variable that is not a loop or collecting variable should usually be assigned once.

## Code Smells Addressed
- One variable carrying more than one responsibility.

- Reassigned input parameters that blur input and result.

## Example

### Before
```typescript
function distanceTravelled(scenario: {
  primaryForce: number;
  secondaryForce: number;
  mass: number;
  delay: number;
}, time: number) {
  let result = 0;
  let acc = scenario.primaryForce / scenario.mass;
  const primaryTime = Math.min(time, scenario.delay);
  result = 0.5 * acc * primaryTime * primaryTime;
  const secondaryTime = time - scenario.delay;

  if (secondaryTime > 0) {
    const primaryVelocity = acc * scenario.delay;
    acc = (scenario.primaryForce + scenario.secondaryForce) / scenario.mass;
    result += primaryVelocity * secondaryTime + 0.5 * acc * secondaryTime * secondaryTime;
  }

  return result;
}
```

### After
```typescript
function distanceTravelled(scenario: {
  primaryForce: number;
  secondaryForce: number;
  mass: number;
  delay: number;
}, time: number) {
  let result = 0;
  const primaryAcceleration = scenario.primaryForce / scenario.mass;
  const primaryTime = Math.min(time, scenario.delay);
  result = 0.5 * primaryAcceleration * primaryTime * primaryTime;
  const secondaryTime = time - scenario.delay;

  if (secondaryTime > 0) {
    const primaryVelocity = primaryAcceleration * scenario.delay;
    const secondaryAcceleration =
      (scenario.primaryForce + scenario.secondaryForce) / scenario.mass;
    result +=
      primaryVelocity * secondaryTime +
      0.5 * secondaryAcceleration * secondaryTime * secondaryTime;
  }

  return result;
}
```

## Mechanics
1. Change the name of the variable at its declaration and first assignment.

2. If later assignments are of the form `i = i + something`, do not split it; that is a collecting variable.

3. If possible, declare the new variable as immutable.

4. Change all references to the variable up to its second assignment.

5. Test.

6. Repeat in stages, renaming the variable at the declaration and changing references until the next assignment, until you reach the final assignment.

## Notes
- Fowler treats loop variables and collecting variables as legitimate reasons for reassignment.

- Common collecting variables accumulate sums, string concatenations, stream output, or collection contents.

- The goal is not fewer assignments by itself; the goal is one responsibility per variable.

- In the parameter example from the book, he first splits the input parameter and then improves the names with Rename Variable.

- Making the split variables `const` protects the design and confirms the new intent.

## Related Refactorings
- Rename Variable.
- Replace Derived Variable with Query.
- Introduce Assertion.
