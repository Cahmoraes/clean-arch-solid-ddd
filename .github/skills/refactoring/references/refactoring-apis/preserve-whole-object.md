# Preserve Whole Object

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when a caller pulls several values out of one record and
passes those pieces to another function.
Pass the whole object instead and let the callee derive the parts it needs.

## Code Smells Addressed
- Repeated unpacking of the same object into separate arguments.

- Feature Envy around a subset of another object's data.

## Example

### Before
```typescript
const low = room.daysTempRange.low;
const high = room.daysTempRange.high;

if (!plan.withinRange(low, high)) {
  alerts.push("room temperature went outside range");
}
```

### After
```typescript
if (!plan.withinRange(room.daysTempRange)) {
  alerts.push("room temperature went outside range");
}

class HeatingPlan {
  withinRange(range: { low: number; high: number }) {
    return (
      range.low >= this._temperatureRange.low &&
      range.high <= this._temperatureRange.high
    );
  }
}
```

## Mechanics
1. Create an empty function with the parameters you want.

2. Give it an easily searchable name so you can replace it later.

3. Fill the new body with a call to the old function, mapping from the new
   parameter to the old parameters.

4. Run static checks.

5. Update each caller to use the new function. Test after each change.

6. Remove any now-dead code that only derived the old arguments.

7. After all callers move over, inline the original function.

8. Rename the new function and its callers.

## Notes
- The main reason to avoid this refactoring is dependency direction. Do not
  make one module depend on a whole object it should not know about.

- Fowler calls out Feature Envy as a common signal that the logic may belong
  closer to the whole object.

- If many places use the same subset of one object, that subset may be a
  good candidate for Extract Class.

- A common missed case is when an object passes several of its own fields to
  another object. In that case, a self-reference may replace them.

- Fowler also shows a variation that creates the new function by composing
  Extract Variable, Extract Function, and Move Function.

## Related Refactorings
- Introduce Parameter Object

- Extract Class
