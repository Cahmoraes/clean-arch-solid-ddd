---
created_at: "2026-05-29T16:42:13-03:00"
updated_at: "2026-05-29T16:42:13-03:00"
---

# Frontend UI Adjustments — Pós Redesign VOLT

Ajustes visuais pontuais após o redesign VOLT, focados em usabilidade da sidebar e consistência das páginas de listagem.

## Escopo

Quatro mudanças isoladas no frontend (`apps/frontend`). Nenhuma alteração de backend, API ou dependências.

---

## 1 — Botão Sair no menu lateral

**Arquivo:** `src/components/layout/authenticated-shell.tsx`

O botão de logout existente está posicionado como ícone-only no rodapé do sidebar, com `max-[860px]:hidden`, tornando-o invisível no estado colapsado. A mudança consiste em:

- **Remover** o `<button>` do rodapé do usuário (linhas 159–166)
- **Adicionar** um item de logout no `<nav>`, após os itens de navegação, com `mt-auto` para fixá-lo ao fundo
- Estilo consistente com `SidebarNavItem`: `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors`
- Comportamento responsivo: ícone + texto "Sair" em modo expandido; apenas ícone centralizado em modo colapsado (`max-[860px]:justify-center` + `span max-[860px]:hidden`)
- Cor: `text-sidebar-muted` → `hover:bg-white/5 hover:text-destructive` no hover

---

## 2 — Filtro de check-ins — largura total

**Arquivo:** `src/features/check-ins/components/check-in-filter-bar.tsx`

O `SegmentedControl` usa `w-fit` por padrão. Para ocupar toda a linha:

- Passar `className="w-full [&>button]:flex-1 [&>button]:justify-center"` ao `SegmentedControl`
- `twMerge` faz override de `w-fit` → `w-full`
- O seletor `[&>button]` distribui os botões com largura igual ao longo da linha
- Afeta ambas as páginas que usam `CheckInFilterBar` (`/check-ins` e `/admin/check-ins`)

---

## 3 — Campo de busca usuários — largura total

**Arquivo:** `src/app/(authenticated)/admin/usuarios/page.tsx`

O `SearchBar` tem `className="w-full max-w-xs"` que limita sua largura. A mudança:

- Remover `max-w-xs`, deixando `className="w-full"`
- O container pai tem `flex flex-wrap`, então o campo ocupa a linha inteira abaixo do filtro de roles

---

## 4 — Suavizar animação de hover nas listagens

**Arquivos:**
- `src/features/check-ins/components/check-in-item.tsx`
- `src/features/admin/components/user-row.tsx`

A transição atual não especifica `duration`, usando o padrão de 150ms que resulta num efeito abrupto. A mudança:

- Adicionar `duration-300 ease-out` às classes de transição
- Mantém `hover:translate-x-0.5` e `hover:border-border-strong`; apenas a velocidade e curva mudam

---

## Critérios de Conclusão

- `pnpm --filter frontend lint:fix` sem erros
- `pnpm --filter frontend tsc:check` sem erros
- `pnpm --filter frontend test` passando
- `pnpm --filter frontend build` com sucesso
- Logout visível e funcional em sidebar expandida e colapsada
- Filtro de check-ins e campo de busca ocupando 100% da largura disponível
- Hover das listas com transição fluida (~300ms)
