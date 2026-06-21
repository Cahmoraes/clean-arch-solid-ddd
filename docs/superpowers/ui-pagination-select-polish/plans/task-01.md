# Task 1: Paginação — substituir botões Anterior/Próxima por ícones

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/ui-pagination-select-polish-design.md`
**Depends on:** N/A

## Visão Geral

`PaginationPrevious` e `PaginationNext` atualmente usam `size="md"` com textos "Anterior" e "Próxima" ao lado dos ícones. Em viewports estreitas o componente fica apertado. A solução é remover os spans de texto e usar `size="icon"` (h-10 w-10 p-0), alinhando os botões de navegação visualmente com os botões de número de página.

## Arquivos

- Modify: `apps/frontend/src/components/ui/pagination.tsx`
- Create: `apps/frontend/src/components/ui/pagination.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: ajuste de variant e remoção de classes utilitárias (gap-1, pl-3, pr-3)
- `shadcn`: modificação de componente base shadcn/ui — respeitar o padrão de buttonVariants e size props
- `vercel-react-best-practices`: componente presentacional puro, sem lógica de estado
- `frontend-design`: ajuste de sizing e espaçamento visual no design system

### Fidelidade Visual

- **Fonte de design original:** nenhuma; seguir o mockup da sessão de brainstorming (ícones `<` e `>` compactos, alinhados com os números de página)
- **Decisões visuais já tomadas:** `size="icon"` = `h-10 w-10 p-0`; sem texto; `aria-label` preservados para acessibilidade

## Passos

- **Step 1: Escrever o teste falhando**

Criar o arquivo `apps/frontend/src/components/ui/pagination.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PaginationNext, PaginationPrevious } from "./pagination"

describe("PaginationPrevious", () => {
  test("não renderiza o texto 'Anterior'", () => {
    render(<PaginationPrevious href="#" />)
    expect(screen.queryByText("Anterior")).not.toBeInTheDocument()
  })

  test("tem aria-label para screen readers", () => {
    render(<PaginationPrevious href="#" />)
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toBeInTheDocument()
  })
})

describe("PaginationNext", () => {
  test("não renderiza o texto 'Próxima'", () => {
    render(<PaginationNext href="#" />)
    expect(screen.queryByText("Próxima")).not.toBeInTheDocument()
  })

  test("tem aria-label para screen readers", () => {
    render(<PaginationNext href="#" />)
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toBeInTheDocument()
  })
})
```

- **Step 2: Rodar o teste para confirmar que falha**

```bash
pnpm --filter frontend test -- --run pagination
```

Esperado: 2 falhas — "Anterior" e "Próxima" são encontrados no DOM (ainda existem).

- **Step 3: Implementar a mudança em `pagination.tsx`**

Substituir `PaginationPrevious` (linhas 70–84 atuais):

```tsx
function PaginationPrevious({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="icon"
      className={cn("", className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
    </PaginationLink>
  )
}
```

Substituir `PaginationNext` (linhas 87–102 atuais):

```tsx
function PaginationNext({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="icon"
      className={cn("", className)}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
}
```

- **Step 4: Rodar o teste para confirmar que passa**

```bash
pnpm --filter frontend test -- --run pagination
```

Esperado: 4 testes passando.

- **Step 5: Rodar lint e type-check**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero erros em ambos.

- **Step 6: Verificar visualmente no browser**

Iniciar o servidor de dev:
```bash
pnpm --filter frontend dev
```

Navegar para qualquer página com paginação (ex.: `/admin/usuarios`). Confirmar que:
- Os botões `<` e `>` têm o mesmo tamanho dos números de página (h-10 w-10)
- Nenhum texto "Anterior" ou "Próxima" aparece
- O layout não quebra em viewport estreita

- **Step 7: Commit**

```bash
git add apps/frontend/src/components/ui/pagination.tsx \
        apps/frontend/src/components/ui/pagination.test.tsx
git commit -m "fix(ui): paginação usa ícones apenas em Anterior/Próxima"
```

## Critérios de Sucesso

- `PaginationPrevious` e `PaginationNext` não renderizam texto visível
- `aria-label` preservados ("Go to previous page" / "Go to next page")
- 4 testes unitários passando em `pagination.test.tsx`
- `lint:fix` e `tsc:check` sem erros
- Visual: botões de navegação alinhados com os botões de número de página
