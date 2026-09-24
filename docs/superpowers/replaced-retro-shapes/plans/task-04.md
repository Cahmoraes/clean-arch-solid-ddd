# Task 4: Tipografia de terminal nos componentes compartilhados [FR-005, FR-006]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-02, task-03

## Visão Geral

Esta task aplica `font-display` (VT323) aos papéis de destaque dos componentes compartilhados — títulos, eyebrow, botão, valor de KPI, badges e rótulo de seção da sidebar — na escala ~1,25× e nunca abaixo de 15px, conforme a fonte de display produzida na task-02. Não altera forma (já normalizada na task-03), só tipografia.

## Arquivos

- Modify: `apps/frontend/src/components/ui/eyebrow.tsx`
- Modify: `apps/frontend/src/components/ui/card.tsx`
- Modify: `apps/frontend/src/components/ui/dialog.tsx`
- Modify: `apps/frontend/src/components/ui/alert-dialog.tsx`
- Modify: `apps/frontend/src/components/ui/sheet.tsx`
- Modify: `apps/frontend/src/components/ui/page-header.tsx`
- Modify: `apps/frontend/src/components/ui/button.tsx`
- Modify: `apps/frontend/src/components/ui/stat-card.tsx`
- Modify: `apps/frontend/src/components/ui/status-badge.tsx`
- Modify: `apps/frontend/src/components/ui/role-badge.tsx`
- Modify: `apps/frontend/src/components/ui/admin-badge.tsx`
- Modify: `apps/frontend/src/components/ui/segmented-control.tsx`
- Modify: `apps/frontend/src/components/ui/avatar.tsx`
- Modify: `apps/frontend/src/components/ui/brand-mark.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/ui/eyebrow.test.tsx`
- Test: `apps/frontend/src/components/ui/button.test.tsx`
- Test: `apps/frontend/src/components/ui/card.test.tsx`
- Test: `apps/frontend/src/components/ui/stat-card.test.tsx`

## Interfaces

- **Consome:** `--font-display` apontando para VT323 com fallback monoespaçado, produzido pela task-02; classes `rounded-*` já normalizadas nos mesmos arquivos pela task-03 (esta task não reabre a discussão de forma, só troca classes de tipografia nos mesmos elementos).
- **Produz:** classes de tipografia finais em `Eyebrow`, `CardTitle`, `DialogTitle`, `AlertDialogTitle`, `SheetTitle`, `PageHeader` h1, `Button`/`buttonVariants`, `StatCard` (valor e badge delta), `StatusBadge`, `RoleBadge`, `AdminBadge`, badges de `SegmentedControl`, iniciais de `Avatar`, `BrandMark` wordmark e rótulo de seção da sidebar — todas em `font-display`/`font-normal`, ≥ 15px. `StatCard` **não** recebe prop `className` nesta task (fica para a task-07, que a usa para aplicar `crt-scanlines` via `kpi-cards.tsx`). Tasks 6 e 7 consomem essas classes sem reabri-las.

### Skills a invocar

- `tailwindcss`: aplicar tamanhos arbitrários (`text-[15px]`, `text-[26px]`, `text-[30px]`, `text-[38px]`, `text-[48px]`) e `tracking-*` corretamente.
- `shadcn`: `DialogTitle`, `AlertDialogTitle`, `SheetTitle` são primitivos Radix/shadcn; preservar a API de slot ao trocar só a classe de texto.
- `wcag-audit-patterns`: VT323 tem x-height baixa; confirmar que nenhum texto fica abaixo de 15px e que o contraste do texto (sem considerar scanline, que só chega na task-07) permanece ≥ 4,5:1.
- `test-antipatterns`: testes devem asserir a classe/tamanho renderizado real, não snapshotar o DOM inteiro.

## Passos

- **Step 1: Review Focus: "Rótulo, eyebrow ou badge em VT323 → nunca abaixo de 15px, mesmo onde hoje é 10–12px" — Write the failing test (Eyebrow)**

```tsx
test("Eyebrow usa font-display em 15px, nunca abaixo disso", () => {
	render(<Eyebrow>Painel</Eyebrow>)
	const el = screen.getByText("Painel")
	expect(el).toHaveClass("font-display")
	expect(el).toHaveClass("text-[15px]")
	expect(el).not.toHaveClass("font-mono")
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/eyebrow.test.tsx`
Expected: FAIL — `Eyebrow` ainda renderiza `font-mono text-[11px]`.

- **Step 3: Write minimal implementation — eyebrow.tsx**

Trocar a classe base de `"font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-accent"` para `"font-display text-[15px] font-normal uppercase tracking-[0.12em] text-accent"`.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/eyebrow.test.tsx`
Expected: PASS.

- **Step 5: Write the failing test (Button)**

```tsx
test("Button base usa font-display uppercase, nunca font-medium/font-mono", () => {
	render(<Button>Salvar</Button>)
	const btn = screen.getByRole("button", { name: "Salvar" })
	expect(btn).toHaveClass("font-display")
	expect(btn).toHaveClass("uppercase")
	expect(btn).toHaveClass("tracking-[0.06em]")
	expect(btn).not.toHaveClass("font-medium")
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/button.test.tsx`
Expected: FAIL — `Button` ainda usa `font-medium` sem `font-display`/`uppercase`.

- **Step 7: Write minimal implementation — button.tsx**

Na classe base (`buttonVariants`, l.11-12), trocar `font-medium` por `font-display uppercase tracking-[0.06em] font-normal`. Nas variantes de tamanho existentes, ajustar o tamanho de fonte para `text-[16px]` (sm), `text-[18px]` (md, padrão) e `text-[20px]` (lg), preservando padding/altura atuais de cada variante. Os testes existentes em `button.test.tsx:13-17,66-67` (`"rounded-md"` e `not.toHaveClass("rounded-full")`) continuam válidos e não devem ser alterados.

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/button.test.tsx`
Expected: PASS.

- **Step 9: Write the failing test (CardTitle em card.test.tsx, valor do StatCard em stat-card.test.tsx)**

```tsx
// apps/frontend/src/components/ui/card.test.tsx
test("CardTitle usa font-display 26px", () => {
	render(<Card><CardTitle>Check-ins da semana</CardTitle></Card>)
	expect(screen.getByText("Check-ins da semana")).toHaveClass("font-display")
	expect(screen.getByText("Check-ins da semana")).toHaveClass("text-[26px]")
})
```

```tsx
// apps/frontend/src/components/ui/stat-card.test.tsx
test("valor do StatCard usa font-display 38/48px, nunca font-mono", () => {
	render(<StatCard label="Check-ins" value="42" />)
	const value = screen.getByText("42")
	expect(value).toHaveClass("font-display")
	expect(value).toHaveClass("text-[38px]")
	expect(value).toHaveClass("md:text-[48px]")
	expect(value).not.toHaveClass("font-mono")
})
```

- **Step 10: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/card.test.tsx`
Expected: FAIL — `CardTitle` ainda usa `font-semibold` sem `font-display`/tamanho.

Run: `pnpm --filter frontend exec vitest run src/components/ui/stat-card.test.tsx`
Expected: FAIL — o valor do `StatCard` ainda usa `font-mono text-3xl font-bold`.

- **Step 11: Write minimal implementation — card.tsx e stat-card.tsx**

`card.tsx` `CardTitle`: trocar `"leading-none font-semibold"` por `"font-display text-[26px] font-normal leading-none"`.
`stat-card.tsx` valor (l.58): trocar `"font-mono text-3xl font-bold leading-none tracking-tight tabular md:text-[38px]"` por `"font-display text-[38px] font-normal leading-none tracking-tight tabular md:text-[48px]"`.
`stat-card.tsx` badge delta (l.~48): trocar `"inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[12.5px] font-bold"` (já com `rounded-sm` da task-03) por `"inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-display text-[15px] font-normal"`.

- **Step 12: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/card.test.tsx`
Expected: PASS.

Run: `pnpm --filter frontend exec vitest run src/components/ui/stat-card.test.tsx`
Expected: PASS.

- **Step 13: Aplicar o restante da tipografia de destaque (mecânico, verbatim)**

| Arquivo | Classe atual | Classe alvo |
|---|---|---|
| `ui/dialog.tsx` `DialogTitle` | `"text-2xl font-medium leading-none tracking-tight font-display text-card-foreground"` | `"text-[30px] font-normal leading-none tracking-tight font-display text-card-foreground"` |
| `ui/alert-dialog.tsx` `AlertDialogTitle` | mesmo padrão do `DialogTitle` (confirmar abrindo o arquivo) | aplicar a mesma fórmula: `text-2xl font-medium` → `text-[30px] font-normal` |
| `ui/sheet.tsx` `SheetTitle` | `"font-semibold text-foreground"` | `"font-display text-[26px] font-normal text-foreground"` |
| `ui/page-header.tsx` h1 | `"font-display text-2xl font-semibold tracking-tight md:text-[30px]"` | `"font-display text-[30px] font-normal tracking-tight md:text-[38px]"` |
| `ui/status-badge.tsx` | `"inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold"` (já `rounded-sm` da task-03) | `"inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-display text-[15px] font-normal"` |
| `ui/role-badge.tsx` | `"inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-semibold"` | `"inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-display text-[15px] font-normal"` |
| `ui/admin-badge.tsx` | `"inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"` | `"inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-0.5 font-display text-[15px] font-normal uppercase tracking-wide text-primary-foreground"` |
| `ui/segmented-control.tsx` InlineBadge | `"rounded-sm px-1.5 py-0.5 font-mono text-[11.5px]"` | `"rounded-sm px-1.5 py-0.5 font-display text-[15px] font-normal"` |
| `ui/segmented-control.tsx` FloatBadge | `"... rounded-sm border border-background bg-accent px-1 py-0 text-center font-mono text-[10px] font-bold leading-4.5 ..."` | trocar `font-mono text-[10px] font-bold` por `font-display text-[15px] font-normal`, ajustando `leading-*` se o texto quebrar o layout da pill |
| `ui/avatar.tsx` iniciais | `"... font-display font-bold text-accent-foreground"` | `"... font-display font-normal text-accent-foreground"` |
| `ui/brand-mark.tsx` wordmark | `"font-display text-xl font-bold tracking-wide"` | `"font-display text-xl font-normal tracking-wide"` |
| `components/layout/authenticated-shell.tsx` rótulo de seção (l.216, 235) | `"px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-sidebar-muted max-[860px]:hidden"` | `"px-3 pb-2 font-display text-[15px] uppercase tracking-[0.18em] text-sidebar-muted max-[860px]:hidden"` |

Nenhum destes elementos fica abaixo de `text-[15px]`.

- **Step 14: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/components apps/frontend/src/components/layout/authenticated-shell.tsx
git commit -m "feat(frontend): tipografia VT323 nos componentes compartilhados de destaque"
```

## Critérios de Sucesso

- `Eyebrow`, `CardTitle`, `DialogTitle`, `AlertDialogTitle`, `SheetTitle`, `PageHeader` h1, `Button`, valor e badge delta do `StatCard`, `StatusBadge`, `RoleBadge`, `AdminBadge`, badges do `SegmentedControl`, iniciais do `Avatar`, wordmark do `BrandMark` e rótulo de seção da sidebar usam `font-display` em peso `font-normal` (FR-005, FR-006).
- Nenhum texto em `font-display` fica abaixo de `text-[15px]` (FR-006).
- Texto corrido, campos e tabelas continuam em Inter (nenhum arquivo desta task altera `font-sans`).
