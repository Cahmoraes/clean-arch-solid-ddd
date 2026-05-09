# Duplicated Code

## What It Is
Duplicated code appears when the same structure shows up
in more than one place. The book treats duplication as a
strong hint that the program would improve if the copies
were unified.

Exact duplicates are only the simplest case. Near-
duplicates also matter because readers still need to
compare them carefully to discover what really differs.

## Why It's a Problem
Duplication raises reading cost because every copy must be
checked for subtle differences. It also raises change cost
because one business rule now lives in several places.

When one copy changes and another does not, the code
drifts into inconsistent behavior that is easy to miss.

## Example (Bad)
```typescript
function monthlyCharge(plan: Plan, seats: number) {
  const base = plan.pricePerSeat * seats;
  const support = plan.prioritySupport ? 49 : 0;
  const setup = plan.setupFee;

  if (plan.discountRate > 0) {
    return base + support + setup - base * plan.discountRate;
  }

  return base + support + setup;
}

function annualCharge(plan: Plan, seats: number) {
  const base = plan.pricePerSeat * seats * 12;
  const support = plan.prioritySupport ? 49 * 12 : 0;
  const setup = plan.setupFee;

  if (plan.discountRate > 0) {
    return base + support + setup - base * plan.discountRate;
  }

  return base + support + setup;
}

function renewalCharge(plan: Plan, seats: number) {
  const base = plan.pricePerSeat * seats * 12;
  const support = plan.prioritySupport ? 49 * 12 : 0;

  if (plan.discountRate > 0) {
    return base + support - base * plan.discountRate;
  }

  return base + support;
}
```

## How to Detect
- The same expression or statement sequence appears in two
  functions of one class or module.

- Two blocks differ only by ordering, constants, or one
  extra line.

- A change request requires a search for every copy before
  you can start editing.

- Reviewers compare multiple files side by side to check
  whether copies still match.

- Subclasses repeat logic that belongs to their common
  base behavior.

- Bugs are fixed in one copy while similar code remains
  untouched elsewhere.

- The team keeps comments explaining how one copy differs
  from another almost-identical copy.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Extract Function](../../references/first-set/extract-function.md) | When the same fragment appears in multiple places. |
| [Slide Statements](../../references/moving-features/slide-statements.md) | When similar lines need to be grouped before extraction. |
| [Pull Up Method](../../references/inheritance/pull-up-method.md) | When subclasses duplicate behavior from the same hierarchy. |
