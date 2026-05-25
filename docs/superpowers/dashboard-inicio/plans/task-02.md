# Task 2: Criar rota `/inicio` e atualizar redirect pós-login [RF-001, RF-002, RF-003]

**Status:** PENDING
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Criar a rota `/inicio` no grupo autenticado e mudar o redirect padrão após login de `/academias` para `/inicio`. A página fica vazia por ora (placeholder) — o conteúdo real do dashboard será adicionado na Task 7.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/login/page.tsx` (linha 16)
- Create: `apps/frontend/src/app/(authenticated)/inicio/page.tsx`

### Conformidade com as Skills Padrão

- next-best-practices: convenções de arquivo de rota do App Router

## Passos

- [ ] **Step 1: Escrever o teste que verifica o redirect pós-login**

```tsx
// apps/frontend/src/app/(public)/login/page.test.tsx
// Localizar o bloco de teste que chama router.replace após submit bem-sucedido.
// Verificar se ele espera "/inicio". Se o teste já existe com "/academias", atualizá-lo agora.

// Buscar no arquivo a linha com "/academias" e substituir por "/inicio":
// Antes: expect(replace).toHaveBeenCalledWith("/academias")
// Depois: expect(replace).toHaveBeenCalledWith("/inicio")
```

Rodar o teste antes de mudar o código para confirmar que falha:

```bash
cd apps/frontend && pnpm test -- --reporter=verbose "login/page"
```

Esperado: FAIL no assert do redirect (se o teste existir com "/academias").

- [ ] **Step 2: Atualizar DEFAULT_REDIRECT na página de login**

Em `apps/frontend/src/app/(public)/login/page.tsx`, linha 16:

```tsx
// Antes:
const DEFAULT_REDIRECT = "/academias"

// Depois:
const DEFAULT_REDIRECT = "/inicio"
```

Apenas essa linha muda. O resto do arquivo permanece idêntico.

- [ ] **Step 3: Criar a página `/inicio`**

```tsx
// apps/frontend/src/app/(authenticated)/inicio/page.tsx
export default function InicioDashboardPage() {
	return <div data-testid="dashboard-page" />
}
```

Esta página será substituída pelo componente `DashboardPage` na Task 7. Por ora serve de placeholder para validar a rota.

- [ ] **Step 4: Rodar os testes de login**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose "login/page"
```

Esperado: PASS — todos os testes existentes continuam passando, incluindo o redirect para `/inicio`.

- [ ] **Step 5: Lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app/(public)/login/page.tsx \
        apps/frontend/src/app/(authenticated)/inicio/page.tsx
git commit -m "feat(frontend): add /inicio route and update post-login redirect"
```

## Critérios de Sucesso

- `DEFAULT_REDIRECT` na página de login é `/inicio` [RF-002]
- Arquivo `apps/frontend/src/app/(authenticated)/inicio/page.tsx` existe e exporta default component [RF-001]
- A rota é protegida automaticamente pelo middleware existente (grupo `(authenticated)`) [RF-003]
- Testes de login passam com redirect para `/inicio`
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
