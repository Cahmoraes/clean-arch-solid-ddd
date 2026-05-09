# Extract Function

**Formerly:** Extract Method | **Inverse of:** Inline Function

## When to Use
Use this refactoring when a code fragment does something clear enough to deserve its own name.
It helps when you need to explain intent, shrink a long function, or isolate a fragment that takes effort to understand.

## Code Smells Addressed
- Long Function
- Comment as explanation for a code fragment

## Example

### Before
```typescript
function printOwing(invoice: Invoice) {
  let outstanding = 0

  console.log("***********************")
  console.log("**** Customer Owes ****")
  console.log("***********************")

  for (const order of invoice.orders) {
    outstanding += order.amount
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)
  invoice.dueDate = dueDate

  console.log(`name: ${invoice.customer}`)
  console.log(`amount: ${outstanding}`)
  console.log(`due: ${invoice.dueDate?.toISOString().slice(0, 10)}`)
}

type Invoice = {
  customer: string
  orders: Array<{ amount: number }>
  dueDate?: Date
}
```

### After
```typescript
function printOwing(invoice: Invoice) {
  printBanner()
  const outstanding = calculateOutstanding(invoice)

  recordDueDate(invoice)
  printDetails(invoice, outstanding)
}

function printBanner() {
  console.log("***********************")
  console.log("**** Customer Owes ****")
  console.log("***********************")
}

function calculateOutstanding(invoice: Invoice) {
  let result = 0

  for (const order of invoice.orders) {
    result += order.amount
  }

  return result
}

function recordDueDate(invoice: Invoice) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)
  invoice.dueDate = dueDate
}

function printDetails(invoice: Invoice, outstanding: number) {
  console.log(`name: ${invoice.customer}`)
  console.log(`amount: ${outstanding}`)
  console.log(`due: ${invoice.dueDate?.toISOString().slice(0, 10)}`)
}
```

## Mechanics
1. Create a new function and name it for the intention behind the fragment.
   Choose a name that says what the code means, not how it works.
2. If the language supports nested functions, place the new function next to the source code.
   That keeps the refactoring local while you shape the boundary.
3. Copy the extracted statements into the new function.
   Keep the behavior the same before you improve anything else.
4. Identify local variables the new function needs from the old scope.
   Pass each needed value as a parameter.
5. Move any variable that is declared outside but used only inside the fragment.
   Put that declaration inside the extracted function.
6. Check whether the fragment assigns to any local variable.
   If there is one assigned variable, return it; if there are several, stop and reconsider.
7. Compile or run quick checks after resolving variables.
   Variable handling is the part most likely to go wrong.
8. Replace the original fragment with a call to the new function.
   Keep the call site as small and direct as possible.
9. Test after the replacement.
   Confirm behavior before looking for the next extraction.
10. Look for duplicated code that now matches the new function.
    Replace those copies with calls when it improves clarity.

## Notes
- Fowler treats naming as the main payoff; a good name often matters more than fragment size.
- Small extracted functions are fine, even when the body is only a few lines.
- If the fragment mutates several locals, split variables or reshape the code before extracting.
- In classes, Extract Function often leads naturally to moving behavior later.
- Do not let performance worries block this refactoring without evidence.
- This refactoring often replaces comments with names that explain the code better.

## Related Refactorings
- Inline Function
- Extract Variable
- Replace Inline Code with Function Call
- Move Function
