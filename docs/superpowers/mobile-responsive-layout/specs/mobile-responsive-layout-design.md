---
feature: mobile-responsive-layout
created_at: 2026-06-03T18:34:11.001Z
status: approved
---

# Design: Mobile Responsive Layout

## Visão Geral

Melhorias de UX para viewports mobile (<768px) em quatro áreas do frontend:

1. **Filter bars** (check-ins admin, check-ins membro, usuários admin) — filtros que quebram para linhas extras são substituídos por um botão "Filtros" que abre um `Sheet` bottom-sheet.
2. **Check-ins membro — espaçamento** — gap excessivo entre a barra de filtros e a linha busca/ordenação é corrigido para `gap-3`, alinhando com o padrão da tela de usuários.
3. **StatusDonutCard** — abaixo de `md`, a legenda vai para baixo do donut em layout `flex-col`.
4. **Dashboard geral** — tipografia reduzida no mobile (`text-2xl md:text-3xl`), altura do WeeklyChart responsiva, InlineStats do ProfileHeroCard empilhado com borda superior.

Escopo: **frontend-only**. Nenhuma mudança de backend, sem novas dependências.

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Usabilidade | Filtros inacessíveis em mobile bloqueiam o fluxo principal de trabalho dos admins | Todos os filtros devem ser acessíveis em 375px sem scroll horizontal |
| Manutenibilidade | Padrão único de responsividade em toda a aplicação reduz divergência futura | Nenhum novo breakpoint customizado além dos já existentes (`md`, `max-[1100px]`, `max-[560px]`) |
| Performance | Layout shift visível ao abrir o Sheet deve ser imperceptível | Zero JS de layout no render SSR (CSS-only toggle) |

**Consideradas, não priorizadas:** Internacionalização (sem expansão prevista), Acessibilidade além do mínimo (Sheet do Radix já trata focus trap e `role="dialog"`).

---

## Decisões Arquiteturais

### D1. CSS toggle em vez de `useMediaQuery`

- **Contexto:** Precisamos ocultar a filter bar inline no mobile e exibir o botão do Sheet. A alternativa seria um hook `useMediaQuery` que troca o componente renderizado via JS.
- **Decisão:** `hidden md:flex` / `flex md:hidden` no mesmo componente, sem JS de layout.
- **Justificativa técnica:** Zero hydration mismatch, zero FOUC, consistente com todos os outros padrões de responsividade já presentes no projeto.
- **Justificativa de negócio:** Menor custo de manutenção — qualquer dev que conheça Tailwind entende o padrão sem documentação adicional.
- **Trade-offs aceitos:** Ambas as versões (mobile e desktop) renderizam nós DOM simultaneamente. Para componentes de filtro esse overhead é irrelevante; seria revisitável apenas em listas virtualizadas com centenas de linhas.

### D2. `Sheet` do shadcn/ui como primitivo do bottom sheet

- **Contexto:** Precisamos de um painel que abre do rodapé em mobile para conter os filtros. Alternativas: drawer customizado, `Popover`, `Dialog` posicionado.
- **Decisão:** `Sheet` do shadcn/ui com `side="bottom"`.
- **Justificativa técnica:** `@radix-ui/react-dialog` já está instalado — o Sheet é um wrapper com zero dependência nova. Focus trap, `aria-modal`, e `Escape` para fechar são providos gratuitamente pelo Radix.
- **Justificativa de negócio:** Zero custo de instalação, zero risco de conflito de versão.
- **Trade-offs aceitos:** O Sheet adiciona um `role="dialog"` ao DOM — comportamento esperado e desejável. Não há suporte nativo a swipe-to-close (aceitável para o contexto admin).

### D3. Estado `open/closed` do Sheet local ao componente de filtro

- **Contexto:** O estado de abertura do Sheet pode viver na URL, em um store Zustand ou localmente.
- **Decisão:** `useState` local no componente de filtro.
- **Justificativa técnica:** O Sheet é UI efêmera (não compartilhável, não persistível, não afeta roteamento). O estado de *qual filtro está selecionado* continua 100% na URL via `searchParams` — sem mudança.
- **Justificativa de negócio:** Complexidade mínima, sem side effects em outros componentes.
- **Trade-offs aceitos:** O Sheet fecha ao navegar para outra página (comportamento correto).

### D4. Componentes de filtro independentes sem wrapper genérico compartilhado

- **Contexto:** `CheckInFilterBar` e `UserFilterBar` têm lógica de filtro diferente. Poderíamos extrair um `MobileFilterSheet` genérico.
- **Decisão:** Cada componente recebe sua seção mobile independentemente — sem abstração compartilhada.
- **Justificativa técnica:** As lógicas divergem (SegmentedControl vs. botões de status); forçar uma interface genérica adicionaria props opcionais e acoplamento frágil.
- **Justificativa de negócio:** Menos risco de regressão — mudança em um componente não afeta o outro.
- **Trade-offs aceitos:** Leve duplicação do padrão `Sheet` em cada FilterBar (~30 linhas). Aceitável pelo benefício de isolamento.

---

## Componentes Afetados

| Arquivo | Mudança |
|---|---|
| `src/features/check-ins/components/check-in-filter-bar.tsx` | Adicionar seção mobile: `flex md:hidden` com botão "Filtros" + Sheet contendo os filtros atuais + chip do filtro ativo + botões Limpar/Aplicar |
| `src/features/admin/components/user-filter-bar.tsx` | Mesmo padrão do CheckInFilterBar |
| `src/app/(authenticated)/check-ins/page.tsx` | Corrigir gap entre FilterBar e linha busca/sort para `gap-3` |
| `src/features/dashboard/components/status-donut-card.tsx` | `flex-col md:flex-row` no container principal; legenda abaixo do donut no mobile |
| `src/features/dashboard/components/profile-hero-card.tsx` | `flex-col md:flex-row` no container; `InlineStats` com `border-t` e centralizado em mobile (remover `ml-auto` no mobile) |
| `src/features/dashboard/components/weekly-chart.tsx` | Altura responsiva: `h-[140px] md:h-[200px]` |
| Componentes de tipografia (StatCard, PageHeader, InlineStats) | `text-2xl md:text-3xl` onde aplicável |

---

## Breakpoints

| Breakpoint | Valor | Uso |
|---|---|---|
| `md` | 768px | Toggle desktop ↔ mobile (único breakpoint novo introduzido nesta feature) |
| `max-[1100px]` | 1100px | Já existente no dashboard — mantido |
| `max-[560px]` | 560px | Já existente — mantido |

---

## Riscos

| Risco | Impacto | Prob. | Score | Mitigação |
|---|---|---|---|---|
| Sheet não configurado no projeto (import path divergente) | 2 | 1 | 2 🟢 | Verificar `components/ui/sheet.tsx` ao iniciar; se ausente, rodar `npx shadcn add sheet` |
| Filtro aplicado ao fechar sheet sem clicar "Aplicar" (estado desincronizado) | 3 | 2 | 6 🔴 | Filtros só aplicados no botão Aplicar; fechar sem aplicar descarta estado local do sheet |
| `ml-auto` no ProfileHeroCard quebrando em viewports 400–600px | 2 | 2 | 4 🟡 | `flex-col` abaixo de `md` elimina o `ml-auto` completamente nessa faixa |
| WeeklyChart com `h-[140px]` cortando barras altas | 1 | 1 | 1 🟢 | Usar `min-h-[140px]` + testar com dados reais no build |

---

## Testes

- Snapshots visuais (se existirem) precisam ser atualizados após mudanças de layout
- Testes unitários existentes dos componentes devem continuar passando sem alteração (apenas CSS muda)
- Verificação manual em 375px (iPhone SE), 390px (iPhone 14) e 768px (iPad)
- Validação obrigatória: `pnpm --filter frontend lint:fix` + `pnpm --filter frontend tsc:check` + `pnpm --filter frontend test` + `pnpm --filter frontend build`
