# Combine Functions into Class

**Formerly:** — | **Inverse of:** Combine Functions into Transform

## When to Use
Use this refactoring when several functions share the same source data and belong together conceptually.
It helps by making the shared context explicit, simplifying call sites, and giving derived values one home.

## Code Smells Addressed
- Repeated derivations from the same record
- Related functions scattered around raw data

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

function calculateBaseCharge(reading: Reading) {
  return baseRate(reading.month, reading.year) * reading.quantity
}

function taxableCharge(reading: Reading) {
  return Math.max(0, calculateBaseCharge(reading) - taxThreshold(reading.year))
}
```

### After
```typescript
class Reading {
  constructor(
    readonly customer: string,
    readonly quantity: number,
    readonly month: number,
    readonly year: number,
  ) {}

  get baseRate() {
    return this.month + this.year * 0.01
  }

  get baseCharge() {
    return this.baseRate * this.quantity
  }

  get taxableCharge() {
    return Math.max(0, this.baseCharge - taxThreshold(this.year))
  }
}

function taxThreshold(year: number) {
  return year > 2020 ? 10 : 5
}
```

## Mechanics
1. Apply Encapsulate Record to the shared data record.
   Start by giving the common data a clear owning abstraction.
2. If the data is not already grouped, use Introduce Parameter Object.
   Bring the shared arguments together first.
3. Take each function that uses the common record and move it to the new class.
   Fowler uses Move Function for each migration.
4. Remove parameters that are now fields on the class.
   The method can read shared state directly.
5. Extract any remaining logic that manipulates the shared data.
   Move that extracted logic into the class as well.

## Notes
- Fowler prefers this over a transform when the data can change over time.
- A class gives derived values one place and avoids repeating how to compute them.
- Once behavior moves in, callers can ask the object instead of rebuilding the formula.
- The book treats this as a way to make an implicit object explicit.
- Encapsulation also helps keep related derivations consistent after updates.
- If the language lacks classes, the same idea can still be modeled with an object plus functions.
- Use this when the cluster of functions feels like one concept waiting to be named.

## Related Refactorings
- Combine Functions into Transform
- Introduce Parameter Object
- Encapsulate Record
- Move Function
