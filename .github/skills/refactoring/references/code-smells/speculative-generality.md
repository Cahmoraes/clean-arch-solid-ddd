# Speculative Generality

## What It Is
Speculative generality appears when code grows hooks,
abstractions, and parameters for futures that never
arrive. The smell is not flexibility itself, but machinery
built for imagined requirements rather than present ones.

Fowler is especially sensitive to this because unused
generality makes code harder to understand without
delivering any current benefit.

## Why It's a Problem
Unused flexibility clutters the design with branches,
indirection, and arguments that readers must understand
but do not need. The code pays maintenance cost for
options nobody uses.

This machinery blocks change because every real
modification must work around the scaffolding for
hypothetical cases.

## Example (Bad)
```typescript
abstract class Exporter {
  export(data: Report, locale?: string, includeCharts?: boolean) {
    const prepared = this.beforeExport(data, locale, includeCharts);
    return this.render(prepared, locale, includeCharts);
  }

  protected beforeExport(data: Report, locale?: string, includeCharts?: boolean) {
    return data;
  }

  protected abstract render(
    data: Report,
    locale?: string,
    includeCharts?: boolean,
  ): string;
}

class CsvExporter extends Exporter {
  protected render(data: Report): string {
    return data.rows.join("
");
  }
}

class JsonExporter extends Exporter {
  protected render(data: Report): string {
    return JSON.stringify(data);
  }
}
```

## How to Detect
- Hooks and extension points exist for cases the system
  does not actually support.

- Parameters are present for possible future variations
  but remain unused.

- Abstract classes or delegation layers do little or
  nothing today.

- Only tests use a function or class that production code
  never calls.

- Readers must step around optional behavior that never
  happens.

- The design talks more about someday than about the
  actual use case.

- Removing the abstraction would simplify understanding
  without losing present capability.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Collapse Hierarchy](../../references/inheritance/collapse-hierarchy.md) | When abstract or inherited structure has no real job. |
| [Inline Function](../../references/first-set/inline-function.md) | When delegation exists only for hypothetical flexibility. |
| [Inline Class](../../references/encapsulation/inline-class.md) | When a class survives only as scaffolding. |
| [Change Function Declaration](../../references/first-set/change-function-declaration.md) | When unused parameters were added for imagined future cases. |
| [Remove Dead Code](../../references/moving-features/remove-dead-code.md) | When only tests or nobody at all uses the abstraction. |
