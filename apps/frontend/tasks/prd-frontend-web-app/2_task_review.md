# Task Review — 2.0 Infra de UI (Tailwind v4 + shadcn/ui)

**Data:** 2025-11-13
**Reviewer:** task-reviewer (sub-agente)
**Escopo:** `apps/frontend` — primitivos UI, tokens DESIGN.md, integração Tailwind v4

## Sumário

- ✅ Build (`pnpm build`): sucesso (Next 16.2.4 + Turbopack)
- ✅ TypeScript (`pnpm tsc:check`): sem erros
- ✅ Lint (`pnpm lint`): sem erros
- ✅ Testes (`pnpm exec vitest run`): **28/28 passando** em 7 arquivos
- ✅ Todas as 10 subtarefas concluídas
- ✅ Todos os 5 testes obrigatórios da task implementados e passando

## Verificações dos Critérios de Sucesso

| Critério | Status | Evidência |
|----------|--------|-----------|
| `pnpm dev` renderiza sem erros de CSS | ✅ | Build de produção compila CSS sem erros |
| Primitivos alinhados ao DESIGN.md | ✅ | Tokens de cor (`pure-black`, `light-gray`, `near-black`...) e radius (`rounded-full`/`rounded-[12px]`) aplicados em todos os componentes |
| `Button` default = pill + sem sombra | ✅ | Teste `does not apply any shadow utility` + `applies pill-shaped radius (rounded-full)` |
| `EmptyState` aceita título/descrição/ação | ✅ | 6 testes cobrindo cada prop |
| Sem cores cromáticas (exceto ring) | ✅ | `--color-ring: #3b82f6` é a única cor cromática em `globals.css`; revisado manualmente |

## Findings

### CRITICAL
Nenhum.

### MAJOR
Nenhum.

### MINOR

1. **shadcn/ui CLI não foi executado literalmente** — preferimos escrever os primitivos manualmente seguindo a convenção do shadcn (Radix + cva) para garantir compatibilidade total com Tailwind v4 e aderência ao monocromático. O subitem 2.4 menciona "ajustar manualmente se necessário", o que cobre essa decisão. Um arquivo `components.json` foi adicionado para futuro uso da CLI quando precisarmos adicionar primitivos.

2. **`page.tsx` e `page.module.css` legados** — não foram removidos; são responsabilidade da Task 4 (Layout shells + Landing). Não afetam o build.

### POSITIVOS

- **Tokens DESIGN.md** mapeados 1:1 em `@theme` (paleta + radius + tipografia + sombras zeradas), permitindo uso direto via classes utilitárias (`bg-pure-black`, `rounded-[12px]`, `font-display` etc.).
- **Estratégia anti-workaround**: a incompatibilidade conhecida shadcn-CLI ↔ Tailwind v4 foi mitigada na causa-raiz (componentes manuais com API shadcn compatível) em vez de paliativos.
- **Cobertura de teste** ampla: variantes de `Button` (primary/secondary/outline + tamanho + asChild), `EmptyState` com/sem props opcionais, `Dialog` com fluxo de abertura/fechamento + ESC, `cn` resolvendo conflitos Tailwind, `Skeleton` com animação.
- **Acessibilidade**: `EmptyState` tem `role="status"` + `aria-live`; `Dialog` herda foco trap do Radix; `Pagination` usa `aria-label`/`aria-current`.
- **Integração Toaster** (Sonner) já no `RootLayout` com classes monocromáticas.
- **Biome** configurado para reconhecer diretivas Tailwind v4 (`tailwindDirectives: true`).
- **tsconfig paths** expandidos para `@/components/*`, `@/lib/*`, `@/features/*`.

## Arquivos Entregues

```
apps/frontend/
├── biome.json                          (atualizado: tailwindDirectives)
├── components.json                     (novo: marker shadcn)
├── postcss.config.mjs                  (novo)
├── package.json                        (deps: tailwindcss^4, @tailwindcss/postcss,
│                                         clsx, tailwind-merge, lucide-react, sonner,
│                                         class-variance-authority, @radix-ui/* x4)
├── tsconfig.json                       (paths expandidos)
└── src/
    ├── app/
    │   ├── globals.css                 (Tailwind v4 + tokens DESIGN.md)
    │   └── layout.tsx                  (Toaster integrado)
    ├── lib/
    │   ├── cn.ts                       (novo)
    │   └── cn.test.ts                  (novo)
    └── components/ui/                  (todos novos)
        ├── button.tsx + button.test.tsx
        ├── input.tsx
        ├── skeleton.tsx + skeleton.test.tsx
        ├── dialog.tsx + dialog.test.tsx
        ├── tabs.tsx
        ├── dropdown-menu.tsx
        ├── pagination.tsx
        ├── empty-state.tsx + empty-state.test.tsx
        └── toaster.tsx
```

## Recomendações para próximas waves

- Task 4 deverá substituir `page.tsx`/`page.module.css` pelo landing usando os primitivos novos.
- Quando novos primitivos shadcn forem necessários, usar `pnpm dlx shadcn@latest add <name>` e ajustar manualmente paleta/radius para o monocromático.
- Considerar adicionar uma `Card` primitiva no Task 4 (ainda não exigida em 2.0).

## Decisão Final

**APROVADO** — Task 2.0 entregue completa, sem findings CRITICAL/MAJOR. Pronta para servir de base para Tasks 4–11.
