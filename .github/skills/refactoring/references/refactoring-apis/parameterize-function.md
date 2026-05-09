# Parameterize Function

**Formerly:** Parameterize Method | **Inverse of:** —

## When to Use
Use this refactoring when several functions do almost the same work and
differ only by literal values.
Replace the family with one function whose parameters carry the variation.

## Code Smells Addressed
- Duplicated logic spread across near-identical functions.

- Literal values that force you to add one more function for every variant.

## Example

### Before
```typescript
function tenPercentRaise(person: { salary: number }) {
  person.salary = person.salary * 1.1;
}

function fivePercentRaise(person: { salary: number }) {
  person.salary = person.salary * 1.05;
}
```

### After
```typescript
function raise(person: { salary: number }, factor: number) {
  person.salary = person.salary * (1 + factor);
}

raise(employee, 0.1);
raise(manager, 0.05);
```

## Mechanics
1. Pick one of the similar functions.

2. Use Change Function Declaration to turn the literals you need into
   parameters.

3. Update each caller of that function to pass the literal value.

4. Test.

5. Change the function body to use the new parameters. Test after each
   change.

6. For each similar function, replace its calls with calls to the new
   parameterized function. Test after each one.

7. If the first parameterized version does not fit another similar case,
   adjust it before you move on to the next one.

## Notes
- Fowler starts with one existing function and stretches it toward the
  other cases instead of designing the final abstraction in one jump.

- In the range example, he also renames the starting function while adding
  parameters so the new name fits the broader role.

- For range logic, he often starts with a middle range because it exposes
  both the lower and upper boundaries.

- Replace literals in the body one at a time. That keeps each small change
  easy to test.

- A guard clause may become logically unnecessary after the change, but you
  may keep it if it documents how to handle that case.

- Parameterization removes duplication and also makes the function useful in
  places the original narrow functions could not cover.

- In the band example, the top range uses `Infinity` once the generalized
  function can express an open-ended upper bound.

## Related Refactorings
- Change Function Declaration

- Remove Flag Argument
