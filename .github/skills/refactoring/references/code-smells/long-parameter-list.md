# Long Parameter List

## What It Is
Long parameter lists ask callers and readers to juggle too
many values at once. They often arise from the healthy
desire to avoid globals, yet they become confusing in
their own way.

The smell is strongest when several arguments always
travel together or when one argument could be reached from
another. In those cases, the signature is exposing more
detail than the caller should manage.

## Why It's a Problem
Long signatures make calls hard to read and easy to misuse
because argument order and meaning blur together. They
also spread one conceptual object across several unrelated
parameters.

Every extra argument creates more coupling between caller
and callee. The function starts to demand bookkeeping
instead of expressing intent.

## Example (Bad)
```typescript
function createShipment(
  orderId: string,
  customerId: string,
  customerName: string,
  street: string,
  city: string,
  state: string,
  postalCode: string,
  country: string,
  weightKg: number,
  volumeCm3: number,
  priority: boolean,
  sendEmail: boolean,
) {
  const service = priority ? "express" : "economy";

  return shipmentGateway.create({
    orderId,
    customerId,
    customerName,
    destination: {
      street,
      city,
      state,
      postalCode,
      country,
    },
    weightKg,
    volumeCm3,
    service,
    notifyByEmail: sendEmail,
  });
}

createShipment(
  order.id,
  customer.id,
  customer.name,
  customer.address.street,
  customer.address.city,
  customer.address.state,
  customer.address.postalCode,
  customer.address.country,
  parcel.weightKg,
  parcel.volumeCm3,
  true,
  false,
);
```

## How to Detect
- Call sites are long enough that readers must line up
  each argument with the declaration.

- Several parameters are always passed together as one
  conceptual bundle.

- One argument can be obtained by querying another
  argument.

- Boolean flags steer different behavior through the same
  signature.

- Many functions share the same small cluster of
  parameters.

- The signature exposes details pulled apart from a richer
  source object.

- Adding one new requirement means touching many callers
  only to thread one more value through.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Replace Parameter with Query](../../references/refactoring-apis/replace-parameter-with-query.md) | When one argument can be derived from another. |
| [Preserve Whole Object](../../references/refactoring-apis/preserve-whole-object.md) | When many parameters come from the same object. |
| [Introduce Parameter Object](../../references/first-set/introduce-parameter-object.md) | When related values always travel together. |
| [Remove Flag Argument](../../references/refactoring-apis/remove-flag-argument.md) | When a boolean selects different behavior paths. |
| [Combine Functions into Class](../../references/first-set/combine-functions-into-class.md) | When several functions share the same recurring parameter values. |
