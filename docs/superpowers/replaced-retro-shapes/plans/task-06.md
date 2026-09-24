# Task 6: Tipografia de terminal em features e páginas [FR-005, FR-006, FR-007]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-02, task-05

## Visão Geral

Esta task troca `font-mono` por `font-display` nos rótulos, eyebrows e números de destaque de `features/**` e `app/**` que hoje usam JetBrains Mono como fonte de destaque, na escala ~1,25× com mínimo 15px. Ids, coordenadas e timestamps — dados tabulares — continuam em `font-mono`, preservando o FR-007.

## Arquivos

- Modify: `apps/frontend/src/features/notices/components/notice-preview.tsx`
- Modify: `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`
- Modify: `apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx`
- Modify: `apps/frontend/src/features/activity/components/activity-pagination-card-header.tsx`
- Modify: `apps/frontend/src/features/admin/analytics/components/retention-mini-stats.tsx`
- Modify: `apps/frontend/src/features/weather/components/current-weather-display.tsx`
- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/[userId]/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-preview.test.tsx`

## Interfaces

- **Consome:** `--font-display` apontando para VT323 com fallback monoespaçado, produzido pela task-02; classes `rounded-*` já normalizadas nos mesmos arquivos pela task-05 (esta task não reabre a forma).
- **Produz:** nenhum símbolo novo — apenas classes de tipografia trocadas nos arquivos acima. Nenhuma task posterior consome diretamente esta troca (a task-08 só audita resíduo de arredondamento e `crt-scanlines`, não de fonte).

### Skills a invocar

- `tailwindcss`: aplicar `text-[15px]`+ e remover `font-bold`/`font-semibold` junto da troca de família.
- `wcag-audit-patterns`: confirmar que nenhum rótulo trocado fica abaixo de 15px e que o contraste permanece adequado.
- `test-antipatterns`: o teste atualizado deve asserir a classe real, sem mockar o componente.

## Passos

- **Step 1: Write the failing test — notice-preview.tsx**

```tsx
test("eyebrow e label do preview usam font-display, não font-mono", () => {
	render(<NoticePreview notice={mockNotice} />)
	expect(screen.getByTestId("notice-eyebrow")).toHaveClass("font-display")
	expect(screen.getByTestId("notice-eyebrow")).not.toHaveClass("font-mono")
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/notices/components/notice-preview.test.tsx`
Expected: FAIL — a asserção atual em `notice-preview.test.tsx:173` espera `font-mono`; com a mudança de expectativa para `font-display`, o teste falha contra a implementação atual (que ainda usa `font-mono`).

- **Step 3: Write minimal implementation — notice-preview.tsx**

Em `notice-preview.tsx:48` e `:66` (eyebrow/label), trocar `font-mono` por `font-display`, remover `font-bold`/`font-semibold` se presentes nesses elementos, e subir o tamanho de fonte em ~1,25× com piso de `text-[15px]`.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/notices/components/notice-preview.test.tsx`
Expected: PASS.

- **Step 5: Aplicar o restante da lista "vira display" (mecânico)**

Para cada linha, trocar `font-mono` por `font-display`, remover `font-bold`/`font-semibold` nesse elemento e subir o tamanho ~1,25× com piso `text-[15px]`:

| Arquivo:linha | Papel |
|---|---|
| `features/calendario-feriados/ui/monthly-calendar.tsx:106` | rótulo de dia |
| `features/calendario-feriados/ui/holiday-list.tsx:85` | data em destaque |
| `features/activity/components/activity-pagination-card-header.tsx:38` | label |
| `features/admin/analytics/components/retention-mini-stats.tsx:23` | número destaque |
| `features/weather/components/current-weather-display.tsx:15,21,25` | temperatura |
| `app/(public)/login/page.tsx:100,123` | números destaque |
| `app/(authenticated)/perfil/[userId]/page.tsx:117` | número/label |
| `app/(authenticated)/perfil/page.tsx:156,181,234,303` | números/labels |
| `app/(authenticated)/calendario/page.tsx:58` | chip de data |
| `app/(authenticated)/assinatura/page.tsx:202,213,264,318,327` | labels/valores |

- **Step 6: Confirmar a lista "fica mono" (nenhuma alteração)**

Abrir cada linha abaixo e confirmar que representa dado tabular (id, coordenada, timestamp) — nesse caso, **não alterar** a classe `font-mono`, preservando o FR-007:

| Arquivo:linha | Papel |
|---|---|
| `features/check-ins/components/check-in-item.tsx:72` | timestamp |
| `features/activity/components/activity-tab.tsx:136,194,257` | timestamps |
| `features/gyms/components/gym-location-picker.tsx:148,160` | coordenadas |
| `features/admin/components/user-row.tsx:145` | id |
| `.../user-detail/user-detail-panel.tsx:61` | id |
| `.../details-tab.tsx:50` | id |

Em caso de dúvida entre rótulo e dado tabular, a regra da spec é: fica `font-mono`. O teste existente `check-ins/components/check-in-item.test.tsx:85` já assere `font-mono` no timestamp e continua passando sem alteração.

- **Step 7: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/features apps/frontend/src/app
git commit -m "feat(frontend): troca font-mono por font-display nos rótulos e números de destaque"
```

## Critérios de Sucesso

- Todos os rótulos/eyebrows/números de destaque listados na lista "vira display" usam `font-display`, nunca abaixo de `text-[15px]`, sem `font-bold`/`font-semibold` (FR-005, FR-006).
- Ids, coordenadas e timestamps da lista "fica mono" continuam em `font-mono`, sem alteração (FR-007).
- `notice-preview.test.tsx` e `check-in-item.test.tsx` passam.
