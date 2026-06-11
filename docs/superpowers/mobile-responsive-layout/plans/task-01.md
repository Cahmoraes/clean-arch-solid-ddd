# Task 1: Instalar Sheet component [FR-002]

**Status:** DONE
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** N/A

## Visão Geral

Verifica se o componente Sheet do shadcn/ui existe e o instala caso ausente. O Sheet é necessário pelas tasks 2 e 3 para o bottom-sheet mobile dos filtros. `@radix-ui/react-dialog` já está instalado no projeto, portanto nenhum pacote npm novo será adicionado.

## Arquivos

- Create: `apps/frontend/src/components/ui/sheet.tsx` (criado pelo shadcn CLI)

### Conformidade com as Skills Padrão

- no-workarounds: não contornar a ausência do arquivo com implementação manual — usar o CLI oficial

## Passos

- **Step 1: Verificar se o arquivo já existe**

```bash
ls apps/frontend/src/components/ui/sheet.tsx 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

Expected: `NOT FOUND` (o agente de pesquisa confirmou ausência)

- **Step 2: Instalar o Sheet via shadcn CLI**

```bash
cd apps/frontend && pnpm dlx shadcn@latest add sheet --yes
```

Expected: arquivo `src/components/ui/sheet.tsx` criado. O comando pode exibir "Installing 0 new packages" porque `@radix-ui/react-dialog@1.1.15` já está em `package.json`.

- **Step 3: Confirmar que o arquivo foi criado**

```bash
ls apps/frontend/src/components/ui/sheet.tsx && echo "OK"
```

Expected: `apps/frontend/src/components/ui/sheet.tsx` / `OK`

- **Step 4: Verificar que o arquivo exporta os nomes esperados**

```bash
grep "export" apps/frontend/src/components/ui/sheet.tsx | head -15
```

Expected: linhas com `export { Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter`, `SheetClose`, `SheetTrigger`, `SheetDescription`

- **Step 5: Executar lint e build para garantir que o arquivo novo não quebra nada**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 6: Commit**

```bash
cd apps/frontend
git add src/components/ui/sheet.tsx
git commit -m "feat(ui): add Sheet component via shadcn

Instala o componente Sheet (shadcn/ui) necessário para o
bottom-sheet mobile de filtros. Usa @radix-ui/react-dialog
já instalado — zero novas dependências npm.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `apps/frontend/src/components/ui/sheet.tsx` existe e exporta `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`
- `pnpm --filter frontend tsc:check` passa sem erros
- `pnpm --filter frontend lint:fix` passa sem erros
- Nenhuma dependência nova em `package.json` (FR-002: sem novas dependências)
