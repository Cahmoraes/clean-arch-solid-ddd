# Introduce Special Case

**Formerly:** Introduce Null Object | **Inverse of:** —

## When to Use
Use this refactoring when many callers test the same special value and most of them respond in the same way.
Fowler centralizes that shared response in a special-case object, literal, or transform.

## Code Smells Addressed
- Repeated checks for the same special value.

- Duplicated fallback behavior spread across many callers.

## Example

### Before
```typescript
function customerName(site: { customer: Customer | "unknown" }) {
  const customer = site.customer;
  if (customer === "unknown") {
    return "occupant";
  }
  return customer.name;
}

function planFor(site: { customer: Customer | "unknown" }) {
  const customer = site.customer;
  return customer === "unknown"
    ? registry.billingPlans.basic
    : customer.billingPlan;
}
```

### After
```typescript
class UnknownCustomer {
  get isUnknown() {
    return true;
  }

  get name() {
    return "occupant";
  }

  get billingPlan() {
    return registry.billingPlans.basic;
  }

  get paymentHistory() {
    return { weeksDelinquentInLastYear: 0 };
  }
}

function customerName(site: { customer: Customer | UnknownCustomer }) {
  return site.customer.name;
}

function planFor(site: { customer: Customer | UnknownCustomer }) {
  return site.customer.billingPlan;
}
```

## Mechanics
1. Start with a container whose subject property is compared to a special-case value, and decide to replace that value with a special-case class or data structure.

2. Add a special-case check property to the subject, returning `false`.

3. Create a special-case object with only the special-case check property, returning `true`.

4. Apply Extract Function to the special-case comparison code, and make every client use that function.

5. Introduce the new special-case subject into the code, either by returning it from a function call or by applying a transform.

6. Change the comparison function so it uses the special-case check property.

7. Test.

8. Use Combine Functions into Class or Combine Functions into Transform to move common special-case behavior into the new element.

9. Since the special case often returns fixed values, you may represent it as a literal record.

10. Use Inline Function on the special-case comparison function in places where you still need the check.

## Notes
- Fowler warns that the transition is tricky because producers and consumers must change together, so he extracts the comparison first.

- In the class-based example, `UnknownCustomer` is not a subclass of `Customer` in JavaScript.

- When the special case returns related objects, those related objects often need their own special-case versions too.

- Special-case objects are value objects and should be immutable.

- If the code only reads data, Fowler shows a literal object as a lighter alternative.

- If the input is raw record data, he shows the same move through a transform step that enriches the record.

## Related Refactorings
- Extract Function.
- Combine Functions into Class.
- Combine Functions into Transform.
- Inline Function.
- Remove Dead Code.
