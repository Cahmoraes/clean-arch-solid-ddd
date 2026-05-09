# Primitive Obsession

## What It Is
Primitive obsession appears when domain ideas are
represented only with primitive types such as numbers and
strings. Fowler points to money, coordinates, ranges, and
codes as concepts that deserve meaningful types of their
own.

Strings are especially fertile ground for the smell
because many domain values are more than text. A phone
number, code, or identifier often has rules, formatting,
and behavior.

## Why It's a Problem
Primitive representations hide domain rules and allow
invalid combinations, such as mixing units or confusing
codes. They spread validation and formatting logic across
the system.

The result is stringly typed code that accepts too much
and explains too little.

## Example (Bad)
```typescript
type Shipment = {
  weight: number;
  weightUnit: string;
  phone: string;
  lowerBound: number;
  upperBound: number;
  priorityCode: string;
};

function canShip(shipment: Shipment) {
  const kilograms = shipment.weightUnit === "lb"
    ? shipment.weight * 0.453592
    : shipment.weight;

  const inRange = kilograms > shipment.lowerBound
    && kilograms < shipment.upperBound;

  const priorityMultiplier = shipment.priorityCode === "EXPRESS"
    ? 1.5
    : 1;

  return inRange && shipment.phone.length >= 10 && priorityMultiplier > 0;
}

const shipment: Shipment = {
  weight: 12,
  weightUnit: "lb",
  phone: "5551999999999",
  lowerBound: 2,
  upperBound: 8,
  priorityCode: "EXPRESS",
};

console.log(canShip(shipment));
```

## How to Detect
- Important domain concepts are represented as plain
  strings or numbers.

- Formatting or validation rules for one primitive value
  repeat in many places.

- Code compares raw type codes to drive behavior.

- Ranges or units are carried as separate primitives
  instead of a single type.

- Several related primitives travel together and act like
  one concept.

- Readers must remember hidden conventions, such as what a
  string code means.

- The compiler cannot distinguish different domain values
  that share the same primitive type.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Replace Primitive with Object](../../references/encapsulation/replace-primitive-with-object.md) | When a primitive really represents a domain concept. |
| [Replace Type Code with Subclasses](../../references/inheritance/replace-type-code-with-subclasses.md) | When a code controls behavior variation. |
| [Replace Conditional with Polymorphism](../../references/conditional-logic/replace-conditional-with-polymorphism.md) | When behavior should follow the richer type. |
| [Extract Class](../../references/encapsulation/extract-class.md) | When groups of primitives form one concept. |
| [Introduce Parameter Object](../../references/first-set/introduce-parameter-object.md) | When related primitives keep appearing together in signatures. |
