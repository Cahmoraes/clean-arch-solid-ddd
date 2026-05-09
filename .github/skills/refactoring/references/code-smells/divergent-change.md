# Divergent Change

## What It Is
Divergent change appears when one module changes in
different ways for different reasons. It usually means
multiple contexts have been packed into the same place.

The symptom shows up over time: every new database,
policy, or business rule sends you back to the same class,
but not to the same part of the class. That is a boundary
problem.

## Why It's a Problem
One module now forces readers to understand several
unrelated concerns before making any change. The module
becomes a crossroads instead of a clear responsibility.

As contexts evolve at different speeds, the class
accumulates unrelated edits and becomes harder to
stabilize.

## Example (Bad)
```typescript
class PortfolioReportService {
  async buildReport(accountId: string) {
    const rows = await database.query(
      "select symbol, quantity, unit_price from positions where account_id = ?",
      [accountId],
    );

    const pricedRows = rows.map((row) => {
      const marketValue = row.quantity * row.unit_price;
      const riskBucket = marketValue > 100000 ? "high" : "standard";

      return {
        symbol: row.symbol,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        marketValue,
        riskBucket,
      };
    });

    return pricedRows.map((row) => ({
      symbol: row.symbol,
      quantity: row.quantity,
      unitPriceLabel: `$${row.unitPrice.toFixed(2)}`,
      marketValueLabel: `$${row.marketValue.toFixed(2)}`,
      complianceLabel: row.riskBucket === "high" ? "manual review" : "ok",
    }));
  }

  async saveAudit(accountId: string, report: object) {
    await database.insert("portfolio_reports", { accountId, payload: report });
  }
}
```

## How to Detect
- One class changes for unrelated reasons, such as storage
  changes and domain rule changes.

- The module contains several clusters of functions, and
  each cluster changes under different circumstances.

- A new feature request affects only some methods while
  other methods belong to another context entirely.

- The code alternates between obtaining data and applying
  business rules without a clear seam.

- You describe the class with “it also” several times.

- Different specialists edit the same module for different
  reasons.

- Change history shows many unrelated edits landing in one
  file.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Split Phase](../../references/first-set/split-phase.md) | When one concern naturally follows another in sequence. |
| [Move Function](../../references/moving-features/move-function.md) | When different contexts should live in separate modules. |
| [Extract Function](../../references/first-set/extract-function.md) | When mixed logic must be separated before moving. |
| [Extract Class](../../references/encapsulation/extract-class.md) | When classes need a formal boundary between responsibilities. |
