# Task 1: Adicionar item Calendário ao menu autenticado [FR-001, FR-002, FR-003]

**Status:** DONE
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Adicionar o item **Calendário** ao `MAIN_NAV_ITEMS` do `AuthenticatedShell`, preservando o padrão de `Link`, ícone, `aria-label`, `aria-current` e detecção ativa por pathname.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: não mascarar falhas de rota/label com asserts frágeis ou casts.
- `test-antipatterns`: testar comportamento real do menu, não a existência de mocks.
- `vercel-react-best-practices`: manter renderização estável do shell sem estado derivado desnecessário.
- `tailwindcss`: preservar tokens/classes existentes da sidebar.
- `shadcn`: preservar acessibilidade e convenções de botões/links já usadas no shell.
- `vitest`: seguir padrão de testes PT-BR com Testing Library.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-feriados-visual.md`.
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original para esta tela? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual:** Visual Companion foi usado no brainstorming; nenhuma fonte externa foi informada.
- **Decisões visuais já tomadas:** item **Calendário** na seção principal da sidebar, ativo em verde, preservando sidebar fixa/collapse existente.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual`. Confirm the original design source with the user; if none exists, build to the curated mockup at `../specs/mockups/calendario-feriados-visual.md` manually.

- **Step 1: Write the failing test**

```tsx
test("exibe Calendário na navegação principal", () => {
  renderAuthenticatedShell({ pathname: "/inicio" });

  const calendarLink = screen.getByRole("link", { name: "Calendário" });

  expect(calendarLink).toHaveAttribute("href", "/calendario");
});

test("marca Calendário como ativo na rota de calendário", () => {
  renderAuthenticatedShell({ pathname: "/calendario" });

  expect(screen.getByRole("link", { name: "Calendário" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL with Testing Library unable to find role `link` named `Calendário`.

- **Step 3: Write minimal implementation**

```tsx
import { CalendarDays } from "lucide-react";

const MAIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/inicio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/check-ins", label: "Check-ins", icon: CheckCircle },
  { href: "/academias", label: "Academias", icon: Building2 },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard },
];
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS for the two new `Calendário` assertions and existing shell assertions.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(frontend): adiciona calendario ao menu autenticado"
```

## Critérios de Sucesso

- `FR-001`: o menu principal da área logada exibe **Calendário**.
- `FR-002`: o link aponta para `/calendario`.
- `FR-003`: `/calendario` aplica `aria-current="page"` no item.
- Nenhuma regra de sidebar colapsada/mobile é alterada.
- A alteração em `AuthenticatedShell` é aditiva: não muda props, export, assinatura ou contrato usado por `apps/frontend/src/app/(authenticated)/layout.tsx`.
