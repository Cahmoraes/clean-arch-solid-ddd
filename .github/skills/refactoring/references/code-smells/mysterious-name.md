# Mysterious Name

## What It Is
Code has a mysterious name when the reader has to puzzle
over an element before understanding its purpose. Fowler
and Beck treat naming as a central part of design: names
should make functions, modules, variables, and classes
mundane and clear.

When a good name will not come, the problem is often
deeper than vocabulary. The design may be muddled enough
that the element does not yet have a crisp responsibility
to name.

## Why It's a Problem
Mysterious names slow every read because the reader must
infer intent from implementation details. That wasted
effort compounds across maintenance, review, and bug
fixing.

They also hide design trouble. If the team cannot name
something clearly, the code may need simplification before
any name will feel right.

## Example (Bad)
```typescript
type CalcInput = {
  a: number;
  b: number;
  c: "regular" | "vip";
};

function fx(x: CalcInput, y: number) {
  const z = x.a * y;
  const w = x.b * 0.2;

  if (x.c === "vip") {
    return z - w;
  }

  return z;
}

class P {
  private d = new Map<string, CalcInput>();

  put(k: string, v: CalcInput) {
    this.d.set(k, v);
  }

  run(q: string, n: number) {
    const r = this.d.get(q);

    if (!r) {
      return 0;
    }

    return fx(r, n);
  }
}

const p = new P();
p.put("gold", { a: 120, b: 15, c: "vip" });
console.log(p.run("gold", 2));
```

## How to Detect
- You must read the body of a function before the name
  makes sense.

- Variables use placeholders such as `x`, `tmp`, `data`,
  or `value` even though the domain has real terms.

- Different modules use different words for the same
  concept, so the vocabulary drifts.

- A name describes mechanics instead of intention, such as
  `handle`, `process`, or `run`.

- Renaming feels risky because the code depends on
  guesswork instead of clear meaning.

- Code reviews spend time decoding names instead of
  discussing behavior.

- The team struggles to agree on a name because the
  underlying responsibility is still vague.

## How to Fix
| Technique | When to Apply |
|-----------|---------------|
| [Change Function Declaration](../../references/first-set/change-function-declaration.md) | When a function name or signature hides intent. |
| [Rename Variable](../../references/first-set/rename-variable.md) | When local names fail to express the domain concept. |
| [Rename Field](../../references/organizing-data/rename-field.md) | When object state uses unclear or misleading labels. |
| [Extract Function](../../references/first-set/extract-function.md) | When a clearer name appears only after isolating one responsibility. |
