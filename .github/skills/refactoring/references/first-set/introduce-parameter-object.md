# Introduce Parameter Object

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when the same group of parameters keeps traveling together.
It helps make that relationship explicit, shrinks call sites, and creates a place to move related behavior later.

## Code Smells Addressed
- Data clumps
- Repeated parameter group

## Example

### Before
```typescript
function amountInvoiced(startDate: Date, endDate: Date) {
  return invoices
    .filter((invoice) => invoice.date >= startDate && invoice.date <= endDate)
    .reduce((sum, invoice) => sum + invoice.amount, 0)
}

function amountReceived(startDate: Date, endDate: Date) {
  return payments
    .filter((payment) => payment.date >= startDate && payment.date <= endDate)
    .reduce((sum, payment) => sum + payment.amount, 0)
}

const invoices: Array<{ date: Date; amount: number }> = []
const payments: Array<{ date: Date; amount: number }> = []
```

### After
```typescript
class DateRange {
  constructor(
    readonly start: Date,
    readonly end: Date,
  ) {}

  contains(date: Date) {
    return date >= this.start && date <= this.end
  }
}

function amountInvoiced(range: DateRange) {
  return invoices
    .filter((invoice) => range.contains(invoice.date))
    .reduce((sum, invoice) => sum + invoice.amount, 0)
}

function amountReceived(range: DateRange) {
  return payments
    .filter((payment) => range.contains(payment.date))
    .reduce((sum, payment) => sum + payment.amount, 0)
}

const invoices: Array<{ date: Date; amount: number }> = []
const payments: Array<{ date: Date; amount: number }> = []
```

## Mechanics
1. Create a new data structure for the grouped values if one does not already exist.
   Fowler prefers a class because it can grow behavior later.
2. Test.
   Start from a stable point before changing declarations.
3. Use Change Function Declaration to add the new parameter object.
   Keep the original parameters for the moment if that eases migration.
4. Test.
   The function should still work while both calling styles coexist.
5. Update each caller to build and pass the new object.
   Test after each caller change or small batch.
6. For each original parameter, replace its uses with fields on the new object.
   Remove the old parameter once all uses are gone.
7. Test.
   Finish only after the function depends on the new object alone.

## Notes
- The real payoff often comes after the grouping, when you move behavior onto the new type.
- Fowler links this refactoring closely to value objects.
- If the grouped data changes together conceptually, a parameter object makes that fact visible.
- The book warns against stopping too early with a dumb data holder if behavior clearly belongs there.
- This refactoring can simplify several functions at once when they all share the same clump.
- Call sites usually become easier to read because a single object tells the story.
- It also prepares the ground for preserving invariants inside the new type.

## Related Refactorings
- Change Function Declaration
- Preserve Whole Object
- Combine Functions into Class
- Move Function
