# Task 3: Campo de busca de usuários em largura total

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/frontend-ui-adjustments-design.md`
**Depends on:** N/A

## Visão Geral

O `SearchBar` na página `/admin/usuarios` tem `className="w-full max-w-xs"`, limitando sua largura a ~320px. Remover `max-w-xs` faz o campo ocupar a linha inteira abaixo do filtro de roles (o container pai já tem `flex flex-wrap`, então o campo quebra naturalmente para a linha seguinte e expande até 100%).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- code-style: convenções de componentes React, Tailwind
- no-workarounds: sem suprimir erros de lint

## Passos

- [ ] **Step 1: Aplicar a mudança em page.tsx**

Esta é uma mudança puramente visual (remoção de classe CSS restritiva). Não há comportamento a testar com Testing Library. O critério de sucesso é lint + build passando.

Arquivo: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

Localizar:
```tsx
				<SearchBar
					data-testid="admin-users-search"
					placeholder="Buscar por nome ou e-mail..."
					value={inputQuery}
					onChange={(e) => setInputQuery(e.target.value)}
					className="w-full max-w-xs"
				/>
```

Substituir por:
```tsx
				<SearchBar
					data-testid="admin-users-search"
					placeholder="Buscar por nome ou e-mail..."
					value={inputQuery}
					onChange={(e) => setInputQuery(e.target.value)}
					className="w-full"
				/>
```

- [ ] **Step 2: Lint + type check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros em ambos

- [ ] **Step 3: Rodar testes da feature admin**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose usuarios
```

Esperado: todos os testes PASS (nenhum teste verifica a largura do campo de busca)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx
git commit -m "feat(frontend): expande campo de busca de usuários para largura total

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `SearchBar` ocupa 100% da largura da linha na página `/admin/usuarios`
- Lint + type check sem erros
- Testes existentes continuam passando
