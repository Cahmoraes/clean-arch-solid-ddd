# Replace Command with Function

**Formerly:** — | **Inverse of:** Replace Function with Command

## When to Use
Use this refactoring when a command object wraps a calculation that is small
and direct.
Collapse the class back into a function when the command's extra structure no
longer pays for its complexity.

## Code Smells Addressed
- A command object that adds indirection without adding useful behavior.

- Supporting methods and fields that only serve a simple one-shot call.

## Example

### Before
```typescript
class ChargeCalculator {
  constructor(
    private readonly customer: Customer,
    private readonly usage: number,
    private readonly provider: Provider,
  ) {}

  get baseCharge() {
    return this.customer.baseRate * this.usage;
  }

  get charge() {
    return this.baseCharge + this.provider.connectionCharge;
  }
}

const monthCharge = new ChargeCalculator(customer, usage, provider).charge;
```

### After
```typescript
function charge(customer: Customer, usage: number, provider: Provider) {
  const baseCharge = customer.baseRate * usage;
  return baseCharge + provider.connectionCharge;
}

const monthCharge = charge(customer, usage, provider);
```

## Mechanics
1. Apply Extract Function to the command creation and the call to its
   execution method. This creates the replacement function.

2. For each method called by the execution method, inline it. If a helper
   returns a value, extract a variable first and then inline the helper.

3. Use Change Function Declaration to move the constructor parameters onto
   the execution method instead.

4. For each field, change references in the execution method to use the new
   parameters. Test after each change.

5. Inline the constructor call and execution call into the replacement
   function.

6. Test.

7. Remove the dead command class.

## Notes
- Fowler only recommends this when the behavior is simple enough that the
  command's flexibility is not worth the extra moving parts.

- He prefers to remove field assignments from the constructor as he goes so
  tests will fail if any field reference remains by mistake.

- After the collapse, a local variable such as `baseCharge` can still keep
  the resulting function readable.

- The point is not to flatten all objects into functions. The point is to
  remove ceremony that no longer earns its keep.

## Related Refactorings
- Extract Function

- Remove Dead Code
