# Combine Functions into Transform

**Formerly:** — | **Inverse of:** Combine Functions into Class

## When to Use
Use this refactoring when several calculations derive values from the same record but you want to keep the data pipeline as a transformation.
It helps collect derived logic in one place and makes those calculations easier to find and reuse.

## Code Smells Addressed
- Duplicated derived logic
- Scattered enrichment of the same record

## Example

### Before
```typescript
type Reading = {
  customer: string
  quantity: number
  month: number
  year: number
}

function baseRate(month: number, year: number) {
  return month + year * 0.01
}

function taxThreshold(year: number) {
  return year > 2020 ? 10 : 5
}

function baseCharge(reading: Reading) {
  return baseRate(reading.month, reading.year) * reading.quantity
}

function taxableCharge(reading: Reading) {
  return Math.max(0, baseCharge(reading) - taxThreshold(reading.year))
}
```

### After
```typescript
type Reading = {
  customer: string
  quantity: number
  month: number
  year: number
  baseCharge?: number
  taxableCharge?: number
}

function enrichReading(reading: Reading) {
  const result = structuredClone(reading)
  result.baseCharge = baseRate(result.month, result.year) * result.quantity
  result.taxableCharge = Math.max(0, result.baseCharge - taxThreshold(result.year))
  return result
}

function baseRate(month: number, year: number) {
  return month + year * 0.01
}

function taxThreshold(year: number) {
  return year > 2020 ? 10 : 5
}
```

## Mechanics
1. Create a transform function that takes the source record and returns the record with added fields.
   The new function becomes the single place for enrichment.
2. Usually start by making a deep copy inside the transform.
   Add a test that proves the original input stays unchanged.
3. Pick one derived calculation and move its body into the transform.
   Store the result on the copied record.
4. Change client code to read the new field from the transformed record.
   Stop recomputing the value outside the transform.
5. If a calculation is complex, extract it first.
   Then call the extracted function from the transform.
6. Test.
   Confirm both the new field and the nonmutation rule.
7. Repeat for the other derived calculations you want to centralize.
   Grow the transform until the enrichment logic lives together.

## Notes
- Fowler recommends this when the source data is treated as immutable or read-only.
- If the record will be updated over time, a class is usually a better fit.
- The transform makes derived values discoverable because they are added in one place.
- The nonmutation test matters; otherwise callers may get surprising shared-state bugs.
- This style fits pipelines and functional code well.
- A transform can coexist with helper functions, but the ownership of derivation should stay clear.
- The book presents this as the nonclass alternative to combining functions around data.

## Related Refactorings
- Combine Functions into Class
- Extract Function
- Encapsulate Record
- Split Phase
