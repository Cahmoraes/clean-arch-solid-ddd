# Task 8: Substituição do DESIGN.md + validação final

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Substituir `apps/frontend/DESIGN.md` pelo novo `DESIGN.md` da raiz do monorepo, adicionando uma nota de adaptação ao topo. Atualizar a referência ao design system em `apps/frontend/CLAUDE.md`. Executar a validação completa (`tsc:check + lint:fix + test + build`) e commitar.

Esta é a última tarefa — ao concluir, o design system antigo (Ollama) estará completamente substituído pelo novo (Superhumon adaptado).

## Arquivos

- Replace: `apps/frontend/DESIGN.md`
- Modify: `apps/frontend/CLAUDE.md` (atualizar descrição do design system)

### Conformidade com as Skills Padrão

- verification-before-completion: executar o gate completo antes do commit final

## Passos

- [ ] **Step 1: Verificar se há referências residuais a tokens removidos no codebase**

```bash
grep -r "text-silver\|bg-pure-white\|bg-pure-black\|text-pure\|bg-snow\|text-stone\|text-near-black\|radius-container\|radius-pill\|ring-blue\|rounded-full" \
  apps/frontend/src \
  --include="*.tsx" \
  --include="*.ts" \
  --include="*.css" \
  -l
```

Se retornar arquivos, verificar cada ocorrência:
- `rounded-full` em `Badge`, `admin-badge`, `ThemeToggleFAB`, `avatar` → **manter** (uso intencional)
- `rounded-full` em Button, Input, Tabs, Pagination → deve ter sido removido nas tarefas anteriores
- Qualquer `text-silver`, `bg-pure-*`, `text-pure-*` → substituir pelo token semântico equivalente antes de prosseguir

- [ ] **Step 2: Copiar e adaptar o DESIGN.md**

Ler o arquivo `/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/DESIGN.md` (raiz do monorepo). Criar `apps/frontend/DESIGN.md` com o conteúdo do arquivo raiz, adicionando a seguinte nota de adaptação ao topo (após o frontmatter YAML se houver, ou como primeira seção):

```markdown
> **Adaptação para contexto SaaS:**
> Este documento é a fonte de verdade do design system. As seguintes adaptações foram feitas
> para o contexto de dashboard SaaS autenticado:
>
> - **Fonte:** Super Sans VF substituída por **Inter Variable** (carregada via `next/font/google`)
> - **Estrutura de três canvas:** A estrutura hero indigo / corpo branco / banda teal
>   NÃO é aplicada nas rotas autenticadas. A sidebar usa `bg-primary` como identidade de marca.
>   Páginas públicas usam `bg-primary` apenas no header.
> - **Dark mode:** O sistema usa `next-themes` com toggle global — os tokens `.dark`
>   são derivados da paleta chromática do design (indigo-deep como surface).
```

- [ ] **Step 3: Atualizar referência ao design system em CLAUDE.md**

Abrir `apps/frontend/CLAUDE.md`. Localizar a seção "Design System" e atualizar a descrição:

Substituir:
```markdown
### Design System
O projeto segue um design system minimalista monocromatico inspirado no Ollama (documentado em `DESIGN.md`):
- Paleta exclusivamente grayscale (sem cores cromaticas na interface)
- Geometria pill-shaped (border-radius 9999px em elementos interativos)
- Zero shadows — separacao via background color e borders
- Componentes base em `src/components/ui/` (shadcn/ui customizado)
```

Por:
```markdown
### Design System
O projeto segue um design system cromático inspirado no Superhumon (documentado em `DESIGN.md`):
- Paleta cromática: indigo navy (`#1b1938`), violet (`#c9b4fa`), teal (`#155555`)
- Tipografia: Inter Variable via `next/font/google`
- Escala gradual de border-radius: 4px / 6px / 8px / 12px / 16px / 9999px
- Sombras em 3 níveis: flat / sm (1px) / md (8px)
- Sidebar usa `bg-primary` (indigo) como identidade de marca
- Dark mode via `next-themes` com tokens derivados da paleta cromática
- Componentes base em `src/components/ui/` (shadcn/ui customizado)
```

- [ ] **Step 4: Executar validação completa**

```bash
pnpm --filter frontend tsc:check
```
Esperado: zero erros de TypeScript.

```bash
pnpm --filter frontend lint:fix
```
Esperado: zero issues do Biome.

```bash
pnpm --filter frontend test
```
Esperado: todos os testes passam.

```bash
pnpm --filter frontend build
```
Esperado: build de produção sem erros.

Se qualquer comando falhar, corrigir o problema antes de prosseguir. Não commitar com falhas.

- [ ] **Step 5: Commit final**

```bash
git add apps/frontend/DESIGN.md \
        apps/frontend/CLAUDE.md
git commit -m "docs(frontend): substituir DESIGN.md monocromatico pelo novo design system cromatico"
```

## Critérios de Sucesso

- `apps/frontend/DESIGN.md` contém o novo design system (Superhumon) com nota de adaptação
- `apps/frontend/CLAUDE.md` descreve a nova paleta cromática na seção Design System
- `pnpm --filter frontend tsc:check` passa com zero erros
- `pnpm --filter frontend lint:fix` passa com zero issues
- `pnpm --filter frontend test` passa completamente
- `pnpm --filter frontend build` compila sem erros
- Nenhuma referência residual a tokens removidos (`text-silver`, `bg-pure-*`, `--radius-pill`, `--radius-container`) fora de contextos intencionais (`rounded-full` em Badge/Avatar está correto)
