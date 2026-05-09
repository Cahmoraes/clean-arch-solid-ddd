# Inline Class

**Formerly:** — | **Inverse of:** Extract Class

## When to Use
Use this refactoring when a class no longer earns its place because it does too little or only forwards calls.
It also helps when you want to redistribute responsibilities and it is easier to collapse two classes first, then split them again in a better shape.

## Code Smells Addressed
- Class with too little behavior
- Excessive delegation

## Example

### Before
```typescript
class TrackingInformation {
  constructor(
    public shippingCompany: string,
    public trackingNumber: string
  ) {}

  get display() {
    return `${this.shippingCompany}: ${this.trackingNumber}`
  }
}

class Shipment {
  constructor(
    private _trackingInformation: TrackingInformation
  ) {}

  get trackingInfo() {
    return this._trackingInformation.display
  }
}

const shipment = new Shipment(new TrackingInformation('FedEx', 'FX-42'))
console.log(shipment.trackingInfo)
```

### After
```typescript
class Shipment {
  constructor(
    public shippingCompany: string,
    public trackingNumber: string
  ) {}

  get trackingInfo() {
    return `${this.shippingCompany}: ${this.trackingNumber}`
  }

  setShippingCompany(value: string) {
    this.shippingCompany = value
  }

  setTrackingNumber(value: string) {
    this.trackingNumber = value
  }
}

const shipment = new Shipment('FedEx', 'FX-42')
shipment.setTrackingNumber('FX-43')
console.log(shipment.trackingInfo)
```

## Mechanics
1. On the target class, create delegating methods for every public method on the source class.
2. Change all external callers to use the target class instead of the source class, testing after each change.
3. Move the source class data and behavior into the target class, testing after each move.
4. Delete the source class when nothing remains.

## Notes
- This is often a staging move. Collapse first, then extract again with better boundaries.
- Create the delegators first so client code can move before the source internals move.
- A class that only passes messages through has stopped paying rent.
- Do not keep the old shell around after the move. That leaves the smell in place.
- This refactoring is the inverse of **Extract Class**.

## Related Refactorings
- Extract Class
- Move Function
- Move Field
- Inline Function
