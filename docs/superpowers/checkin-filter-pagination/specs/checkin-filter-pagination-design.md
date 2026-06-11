---
created_at: "2026-05-20T11:55:51-03:00"
updated_at: "2026-05-20T11:55:51-03:00"
---

# Design Spec — Filtro e Paginação de Check-ins

## Visão Geral

Adicionar filtro por status e paginação na tela de check-ins do usuário (`/check-ins`) e no painel admin (`/admin/check-ins`). O objetivo é evitar que a lista cresça de forma incontrolável e permitir que o usuário/admin encontre rapidamente check-ins por categoria.

**Escopo:** somente frontend. O backend já suporta os parâmetros necessários (`status` e `page`) em ambos os endpoints.

---

## Requisitos

### Funcionais

- **F1** — Filtrar check-ins por status: Todos, Pendentes, Aprovados, Rejeitados.
- **F2** — Paginar a lista com 10 itens por página.
- **F3** — Ao trocar o filtro de status, a página deve ser resetada automaticamente para 1.
- **F4** — O estado do filtro e da página deve ser sincronizado com a URL (`?status=pending&page=2`), permitindo bookmark, compartilhamento e navegação com o botão voltar do browser.
- **F5** — Ambas as telas devem ter filtro e paginação: `/check-ins` (usuário) e `/admin/check-ins` (admin).

### Não funcionais

- O componente de filtro deve ser reutilizável nas duas páginas.
- A implementação deve seguir os padrões existentes do projeto (feature hooks, TanStack Query).
- Nenhuma mudança no backend é necessária.

---

## Mapeamento de Status

| Label na UI | Valor na API | Cor |
|-------------|-------------|-----|
| Todos | `undefined` (sem parâmetro) | — |
| Pendentes | `pending` | Azul |
| Aprovados | `validated` | Verde |
| Rejeitados | `rejected` | Vermelho |

> O backend usa o valor `validated` para check-ins aprovados. A UI exibe "Aprovados" mas envia `validated` na requisição.

---

## Arquitetura

### Novos artefatos

#### `useCheckInFilters` hook
**Localização:** `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts`

Gerencia o estado de `status` e `page` via URL search params do Next.js.

```typescript
type CheckInFilterStatus = 'pending' | 'validated' | 'rejected' | undefined

interface UseCheckInFiltersReturn {
  status: CheckInFilterStatus
  page: number
  setStatus: (status: CheckInFilterStatus) => void  // reseta page para 1
  setPage: (page: number) => void
}

function useCheckInFilters(): UseCheckInFiltersReturn
```

Comportamento:
- Lê `status` e `page` de `useSearchParams()`.
- `setStatus()` chama `router.replace()` com o novo status e `page=1`.
- `setPage()` chama `router.replace()` preservando o status atual.
- Valores ausentes na URL retornam `undefined` (status) e `1` (page) como padrão.

#### `CheckInFilterBar` component
**Localização:** `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`

Componente stateless de pills de filtro.

```typescript
interface CheckInFilterBarProps {
  status: CheckInFilterStatus
  onStatusChange: (status: CheckInFilterStatus) => void
}
```

Renderiza 4 pills usando `Button` do shadcn/ui:
- `variant="default"` no pill ativo
- `variant="outline"` nos pills inativos

### Fluxo de dados

```
URL: /check-ins?status=pending&page=2
        │
  useCheckInFilters()
  ├─ lê searchParams → { status: 'pending', page: 2 }
  └─ expõe setStatus(), setPage()
        │
  useCheckIns({ status, page })  ← hook existente, recebe os params
        │
  GET /check-ins/me?status=pending&page=2  ← backend já suporta
        │
  ┌─────────────────────────────────┐
  │ CheckInFilterBar                │ ← recebe status + onStatusChange
  │ CheckInItem[] (lista filtrada)  │
  │ Pagination                      │ ← componente existente, recebe page + setPage
  └─────────────────────────────────┘
```

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `apps/frontend/src/app/(authenticated)/check-ins/page.tsx` | Integrar `useCheckInFilters`, `CheckInFilterBar` e `Pagination` |
| `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx` | Idem |
| `apps/frontend/src/features/check-ins/api/index.ts` | Adicionar `status` e `page` como params na chamada da API, se ausente |

---

## Paginação

- Usa o componente existente em `apps/frontend/src/components/ui/pagination.tsx`.
- 10 itens por página — valor passado como query param `per_page=10` (ou configurado no hook, conforme padrão da API).
- A paginação só é exibida se `totalPages > 1`, onde `totalPages` vem da resposta da API (campo de metadados de paginação retornado pelo backend).
- O `useCheckIns` hook deve expor `totalPages` (ou equivalente) para que a página possa passá-lo ao componente `Pagination`.

---

## Comportamentos de Edge Case

- **Lista vazia após filtro:** exibir o `EmptyState` existente na página, com mensagem contextual ao filtro ativo (ex.: "Nenhum check-in pendente encontrado").
- **Page inválida na URL** (ex.: `?page=abc`): fazer parse defensivo e defaultar para `1`.
- **Status inválido na URL** (ex.: `?status=foo`): ignorar o valor e tratar como `undefined` (Todos).
- **Troca de filtro durante loading:** cancelar a query anterior (comportamento padrão do TanStack Query com `keepPreviousData` ou `placeholderData`).

---

## Testes

- **Unit tests do hook `useCheckInFilters`:** testar leitura de searchParams, setStatus reseta page para 1, setPage preserva status.
- **Unit tests do `CheckInFilterBar`:** pill ativo com `variant="default"`, callback chamado com valor correto.
- **Integration tests das páginas:** simular query params na URL e verificar que a lista é filtrada corretamente (usando MSW handlers já existentes).
