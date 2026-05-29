# Task 4: Suavizar animação de hover nas listagens

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/frontend-ui-adjustments-design.md`
**Depends on:** N/A

## Visão Geral

Os itens de listagem de check-ins e usuários usam `transition-[transform,border-color]` sem especificar `duration`, resultando na duração padrão de 150ms que parece abrupta ("dura"). Adicionar `duration-300 ease-out` às classes de transição torna a animação fluida. Mudança afeta dois arquivos: `check-in-item.tsx` e `user-row.tsx`.

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-item.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`

### Conformidade com as Skills Padrão

- code-style: convenções de componentes React, Tailwind
- no-workarounds: sem suprimir erros de lint

## Passos

- [ ] **Step 1: Aplicar a mudança em check-in-item.tsx**

Arquivo: `apps/frontend/src/features/check-ins/components/check-in-item.tsx`

Localizar o `<li>` com as classes de transição:
```tsx
		<li
			data-testid={`checkin-item-${checkIn.id}`}
			className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[transform,border-color] hover:translate-x-0.5 hover:border-border-strong"
		>
```

Substituir por:
```tsx
		<li
			data-testid={`checkin-item-${checkIn.id}`}
			className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[transform,border-color] duration-300 ease-out hover:translate-x-0.5 hover:border-border-strong"
		>
```

- [ ] **Step 2: Aplicar a mudança em user-row.tsx**

Arquivo: `apps/frontend/src/features/admin/components/user-row.tsx`

Localizar a string de classes com transição no `<li>`:
```tsx
			className={cn(
				"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-[transform,border-color]",
				isInteractive &&
					"cursor-pointer hover:translate-x-0.5 hover:border-border-strong",
				className,
			)}
```

Substituir por:
```tsx
			className={cn(
				"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-[transform,border-color] duration-300 ease-out",
				isInteractive &&
					"cursor-pointer hover:translate-x-0.5 hover:border-border-strong",
				className,
			)}
```

- [ ] **Step 3: Lint + type check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros em ambos

- [ ] **Step 4: Rodar suites dos dois componentes**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose check-in-item user-row
```

Esperado: todos os testes PASS (mudanças são puramente em classes CSS, sem impacto em comportamento)

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/check-ins/components/check-in-item.tsx \
        apps/frontend/src/features/admin/components/user-row.tsx
git commit -m "feat(frontend): suaviza animação de hover nas listagens (duration-300 ease-out)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Hover nos itens de check-in e usuários tem transição de 300ms com curva `ease-out`
- A animação de `translate-x` e `border-color` permanece; apenas a velocidade/curva muda
- Lint + type check sem erros
- Todos os testes existentes dos dois componentes continuam passando
