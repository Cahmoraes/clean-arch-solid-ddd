# Replace Query with Parameter

**Formerly:** — | **Inverse of:** Replace Parameter with Query

## When to Use
Use this refactoring when a function reaches into ambient scope for a value
you want to push out of the function body.
Pass that value in so the caller owns the dependency and the target function
becomes easier to test and reason about.

## Code Smells Addressed
- A function body that depends on a global or other hidden source.

- Lack of referential transparency caused by reading changing external state.

## Example

### Before
```typescript
class HeatingPlan {
  get targetTemperature() {
    if (thermostat.selectedTemperature > this._max) return this._max;
    if (thermostat.selectedTemperature < this._min) return this._min;
    return thermostat.selectedTemperature;
  }
}
```

### After
```typescript
class HeatingPlan {
  targetTemperature(selectedTemperature: number) {
    if (selectedTemperature > this._max) return this._max;
    if (selectedTemperature < this._min) return this._min;
    return selectedTemperature;
  }
}

if (plan.targetTemperature(thermostat.selectedTemperature) > thermostat.currentTemperature) {
  setToHeat();
}
```

## Mechanics
1. Use Extract Variable on the query so it stands apart from the rest of the
   function body.

2. Apply Extract Function to the code that does not perform that query.

3. Give the new function an easily searchable name for later renaming.

4. Use Inline Variable to remove the temporary you just introduced.

5. Apply Inline Function to the original function.

6. Rename the new function to the original name.

## Notes
- Fowler usually reaches for this refactoring to change dependency
  relationships, not to make signatures longer for its own sake.

- The trade-off is real: the callee becomes cleaner, but callers must now
  compute and pass the value.

- This refactoring often helps build modules of pure or nearly pure
  functions wrapped by code that handles I/O and volatile state.

- It is a practical way to separate a pure core from an outer shell that
  deals with changing inputs.

- Not every shared-scope reference should become a parameter. Long repetitive
  parameter lists can be a problem too.

- When the target object is immutable, pushing external state into a
  parameter can make a method referentially transparent.

## Related Refactorings
- Replace Parameter with Query

- Extract Variable

- Inline Function
