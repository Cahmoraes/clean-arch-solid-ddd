# Split Phase

**Formerly:** — | **Inverse of:** —

## When to Use
Use this refactoring when one block of code is really two distinct stages of work.
It helps when each stage uses different data, answers a different question, or changes for different reasons.

## Code Smells Addressed
- Divergent logic packed into one routine
- Calculation that mixes separate concerns

## Example

### Before
```typescript
function priceOrder(product: Product, quantity: number, shippingMethod: ShippingMethod) {
  const basePrice = product.basePrice * quantity
  const discount = Math.max(quantity - product.discountThreshold, 0) * product.basePrice * product.discountRate
  const price = basePrice - discount

  const shippingPerCase =
    price > shippingMethod.discountThreshold
      ? shippingMethod.discountedFee
      : shippingMethod.feePerCase
  const shippingCost = quantity * shippingPerCase

  return price + shippingCost
}

type Product = {
  basePrice: number
  discountThreshold: number
  discountRate: number
}

type ShippingMethod = {
  discountThreshold: number
  discountedFee: number
  feePerCase: number
}
```

### After
```typescript
function priceOrder(product: Product, quantity: number, shippingMethod: ShippingMethod) {
  const priceData = calculatePricingData(product, quantity)
  return applyShipping(priceData, shippingMethod)
}

function calculatePricingData(product: Product, quantity: number) {
  const basePrice = product.basePrice * quantity
  const discount =
    Math.max(quantity - product.discountThreshold, 0) *
    product.basePrice *
    product.discountRate

  return { basePrice, quantity, discount, price: basePrice - discount }
}

function applyShipping(priceData: PriceData, shippingMethod: ShippingMethod) {
  const shippingPerCase =
    priceData.price > shippingMethod.discountThreshold
      ? shippingMethod.discountedFee
      : shippingMethod.feePerCase

  return priceData.price + priceData.quantity * shippingPerCase
}

type PriceData = { basePrice: number; quantity: number; discount: number; price: number }
type Product = { basePrice: number; discountThreshold: number; discountRate: number }
type ShippingMethod = { discountThreshold: number; discountedFee: number; feePerCase: number }
```

## Mechanics
1. Extract the second phase into its own function.
   Separate the later stage before introducing any new data structure.
2. Test.
   Confirm the extracted phase still produces the same result.
3. Introduce an intermediate data structure and pass it to the extracted phase.
   This structure will become the handoff between stages.
4. Test.
   The second phase should now depend on the handoff object.
5. Review each parameter of the extracted second phase.
   If the first phase produces it, move it into the intermediate structure.
6. Test after each moved value.
   Fowler makes these moves incrementally.
7. If a parameter should not belong to the second phase, extract the needed value first.
   Then move only the result into the handoff structure.
8. Extract the first phase into its own function.
   Make it return the intermediate data structure.
9. If useful, replace the first phase function with a transformer object.
   Fowler notes this as a variation when the first phase needs more structure.

## Notes
- Fowler compares this to compiler stages: each phase should do one kind of work.
- The intermediate data structure is the key design move because it clarifies the boundary.
- After the split, each phase can change more independently.
- This refactoring is valuable when later calculations depend on earlier derived values.
- Extract Function usually does much of the lifting here.
- A transform object can help when the first phase needs its own internal steps.
- Use this when a routine feels like it is answering two questions at once.

## Related Refactorings
- Extract Function
- Combine Functions into Transform
- Introduce Parameter Object
- Move Statements to Callers
