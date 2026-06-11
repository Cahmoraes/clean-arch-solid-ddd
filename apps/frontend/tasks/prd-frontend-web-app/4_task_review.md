# Task Review — 4.0 Layout shells + Landing pública

**Data:** 2025-11-28
**Reviewer:** task-reviewer (sub-agente da skill `executar-task`)
**Escopo:** `apps/frontend` — `PublicShell`, `AuthenticatedShell`, `AdminGuard`, route groups `(public)` / `(authenticated)`, landing RSC e ajustes em `app/layout.tsx`.

## Sumário

- ✅ Build (`pnpm build`): sucesso — `/` renderizada como RSC estática
- ✅ TypeScript (`pnpm tsc:check`): sem erros
- ✅ Lint (`pnpm lint` / Biome): sem erros
- ✅ Testes (`pnpm test`): **65/65 passando** em 17 arquivos
- ✅ Todas as 9 subtarefas concluídas
- ✅ Todos os 5 testes obrigatórios da task implementados e verdes
- ✅ Conflito legado removido (`app/page.tsx` + `page.module.css`) sem regressão

## Arquivos Revisados

| Arquivo | Status | Problemas |
|---------|--------|-----------|
| `apps/frontend/src/components/layout/PublicShell.tsx` | ✅ OK | 0 |
| `apps/frontend/src/components/layout/PublicShell.test.tsx` | ✅ OK | 0 |
| `apps/frontend/src/components/layout/AuthenticatedShell.tsx` | ✅ OK | 0 |
| `apps/frontend/src/components/layout/AuthenticatedShell.test.tsx` | ✅ OK | 0 |
| `apps/frontend/src/components/layout/AdminGuard.tsx` | ✅ OK (1 MINOR) | 1 |
| `apps/frontend/src/components/layout/AdminGuard.test.tsx` | ✅ OK | 0 |
| `apps/frontend/src/app/(public)/layout.tsx` | ✅ OK | 0 |
| `apps/frontend/src/app/(public)/page.tsx` | ✅ OK | 0 |
| `apps/frontend/src/app/(public)/page.test.tsx` | ✅ OK | 0 |
| `apps/frontend/src/app/(authenticated)/layout.tsx` | ✅ OK | 0 |
| `apps/frontend/src/app/(authenticated)/admin/layout.tsx` | ✅ OK | 0 |
| `apps/frontend/src/app/layout.tsx` | ✅ OK | 0 |

## Verificações dos Critérios de Sucesso

| Critério | Status | Evidência |
|----------|--------|-----------|
| Landing acessível em `/` sem autenticação e renderiza como RSC | ✅ | `(public)/page.tsx` sem `"use client"`, sem hooks de cliente; build classifica `/` como **○ Static**; middleware Edge (task 3) só protege `(authenticated)` |
| Rotas autenticadas carregam `AuthenticatedShell` com navegação | ✅ | `(authenticated)/layout.tsx` envolve `children` em `AuthenticatedShell`; teste cobre desktop + mobile nav |
| Menu admin invisível para usuários MEMBER | ✅ | `NAV_ITEMS.filter((item) => !item.requiresRole \|\| item.requiresRole === user?.role)`; teste `oculta link admin quando role é MEMBER` |
| Layout admin redireciona MEMBER para `/` | ✅ | `AdminGuard` chama `router.replace(redirectTo)` em `useEffect` com guarda `user.role !== "ADMIN"`; teste `redireciona MEMBER para /` |
| Navegação funcional em viewport 320px (mobile) e 1280px (desktop) | ✅ | `DesktopNav` `hidden md:flex`; `MobileNav` `md:hidden` toggled por botão hamburger com `aria-expanded`/`aria-controls`; teste `alterna o menu mobile ao clicar no botão` |
| Font fallback SF Pro Rounded aplicada em títulos | ✅ | `--font-display: "SF Pro Rounded", system-ui, ...` em `globals.css`; `<h1>`–`<h6>` recebem `font-family: var(--font-display)` no `@layer base`; títulos da landing/shells usam `font-display` explicitamente |

## Conformidade com Skills

- **vercel-react-best-practices / vercel-composition-patterns**: separação RSC/Client correta — `PublicShell`, `(public)/layout.tsx`, `(public)/page.tsx`, `(authenticated)/layout.tsx`, `(authenticated)/admin/layout.tsx` e `app/layout.tsx` são Server Components; somente `AuthenticatedShell` e `AdminGuard` carregam `"use client"` (precisam de `useAuthStore`, `usePathname`, `useRouter`, `useState`). Sub-componentes (`DesktopNav`, `MobileNav`, `UserMenu`) extraídos do shell para reduzir complexidade do componente client raiz.
- **ui-ux-pro-max**: aderência rigorosa ao DESIGN.md — paleta exclusivamente monocromática (`pure-black`, `near-black`, `pure-white`, `snow`, `light-gray`, `mid-gray`, `stone`, `border-light`, `button-text-dark`); geometria pill (`rounded-full`) em CTAs, links de navegação, botões de hambúrguer e avatar; cards usam `rounded-[12px]` (radius binário); zero `shadow-*`/`gradient` no JSX revisado; CTA primária preta + secundária branca conforme tipologia "Black Pill (CTA)" / "White Pill (Secondary)".
- **typescript-advanced**: `NavItem.requiresRole` literal `"ADMIN"`; `NAV_ITEMS` tipado como `ReadonlyArray<NavItem>`; props com interfaces explícitas exportadas (`PublicShellProps`, `AuthenticatedShellProps`, `AdminGuardProps`).
- **test-antipatterns**: nenhum mock de componente próprio. Apenas `next/navigation` é mockado (boundary externo), o que é a abordagem padrão sob jsdom; o `auth-store` real é manipulado via `useAuthStore.setState`/`clear()` — comportamento real, não dublê. Testes verificam saídas observáveis (papéis ARIA, `data-testid` semânticos, `href`s, presença/ausência de elementos).

## Findings

### CRITICAL
Nenhum.

### MAJOR
Nenhum.

### MINOR

1. **AdminGuard — placeholder de boot é vazio (UX).** Quando `user` ainda é `null` durante o boot (refresh em andamento via `AuthProvider`), o `AdminGuard` renderiza apenas `<div data-testid="admin-guard-loading" aria-busy="true" />` sem nenhum skeleton/feedback visual. Para um sub-layout admin acessado em hard reload, o usuário pode ver tela branca por algumas centenas de ms até o refresh resolver. Sugestão (não bloqueador): reusar o `Skeleton` da task 2.0 ou um pequeno `EmptyState`/spinner monocromático.

2. **AdminGuard — janela curta de "flash" de conteúdo.** A guarda só dispara o `router.replace` dentro do `useEffect`, depois de o componente já ter renderizado `null` para MEMBER (correto), porém o efeito é executado após paint. Como já retornamos `null` no caminho não-ADMIN, não há vazamento visual real, mas o redirect só ocorre no commit pós-render. Isso está adequado ao escopo (guarda visual; o backend e o middleware Edge continuam sendo a barreira de segurança real); registrado como observação para evitar dependência futura desta guarda como controle de acesso.

3. **`NavItem.requiresRole` poderia derivar do tipo do auth-store.** Hoje é `"ADMIN"` literal hardcoded; idealmente reusar o tipo `Role` (ou `User["role"]`) exposto pelo `auth-store` evita drift caso novos papéis sejam introduzidos. Custo trivial; não bloqueia.

4. **`PublicShell` não restringe largura do `<main>`.** O wrapper `flex-1` deixa a responsabilidade de `max-w-6xl` para cada página (a landing já faz isso). É uma escolha legítima, mas vale documentar/convencionar para evitar inconsistência quando outras páginas públicas (login/cadastro) forem criadas em tasks subsequentes.

### POSITIVE

- **Composição RSC/Client exemplar.** Layouts e landing são Server Components puros; o único shell client (`AuthenticatedShell`) está bem isolado e ainda subdivide responsabilidades em sub-componentes (`DesktopNav`, `MobileNav`, `UserMenu`), facilitando manutenção e testes.
- **Acessibilidade cuidadosa.** `aria-label` em logotipo e ações; `aria-current="page"` calculado por `isPathActive`; `aria-expanded`/`aria-controls`/`aria-label` no toggle do mobile com transição entre "Abrir menu de navegação" e "Fechar menu"; uso de `useId` para `aria-controls` evita colisão entre instâncias.
- **Fechamento do menu mobile ao navegar.** `onNavigate={() => setMobileOpen(false)}` em cada `Link` do `MobileNav` evita estado preso após navegação client-side.
- **Limpeza correta do legado.** `app/page.tsx` e `app/page.module.css` foram removidos para evitar conflito de rota com `(public)/page.tsx` (App Router resolveria ambígua); a remoção foi necessária e justificada.
- **`app/layout.tsx` polido.** `lang="pt-BR"` (alinhado ao público-alvo do PRD), classes base `font-sans antialiased bg-pure-white text-pure-black` aplicadas no `<body>`, `Toaster` global no nível raiz pronto para feedback de mutations das próximas tasks.
- **Testes cobrem comportamento, não estrutura.** Verificações por `getByRole`/`within(nav).getByText`/`findByRole("menuitem")` em vez de snapshots; o teste de logout valida o efeito real no store (`useAuthStore.getState().accessToken === null`), não apenas a chamada do mock.
- **Geometria e paleta DESIGN.md aplicadas com rigor.** Pill em todo elemento interativo; cards em `rounded-[12px]`; nenhuma sombra/gradient introduzida; tipografia `font-display` aplicada em headings.

## Conclusão

**APROVADO.** Task 4.0 entregue dentro dos critérios do PRD/TechSpec/DESIGN, sem achados CRITICAL/MAJOR. As 4 observações MINOR são oportunidades de polimento (UX de boot, tipagem de role, restrição opcional de largura) que podem ser endereçadas oportunamente nas tasks de UX (12.0) ou refinos posteriores. Pronto para destravar tasks 5.0 (auth UI), 6.0+ (features) que dependem dos shells.
