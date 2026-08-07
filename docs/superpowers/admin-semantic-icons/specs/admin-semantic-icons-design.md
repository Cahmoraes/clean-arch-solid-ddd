---
created_at: "2026-08-07T18:25:21-03:00"
updated_at: "2026-08-07T18:25:21-03:00"
---

# Design — Ícones Semânticos em Telas Admin

## Visão Geral

Substituir botões e badges textuais por ícones semânticos em três áreas do admin (`/admin/usuarios`, academias, check-ins), reduzindo verbosidade visual sem perder acessibilidade. Escopo puramente de apresentação (frontend) — sem mudança de backend, API ou regras de negócio.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Acessibilidade | Botões ícone-só sem rótulo acessível quebram leitores de tela e usuários de teclado | Todo `Button size="icon"` tem `aria-label` E `Tooltip` associado; nenhum ícone sem rótulo em produção |
| Consistência | Três áreas (usuários, academias, check-ins) divergem hoje em como implementam badges/botões | Mapeamento de ícones centralizado é a única fonte usada pelos 4+ componentes afetados |
| Manutenibilidade | `StatusBadge` passa a ser reaproveitado fora do contexto de usuário | `gym-row.tsx` não mantém markup de badge próprio após a migração |

**Consideradas, não priorizadas:** performance (mudança é puramente visual, sem impacto mensurável), internacionalização (`aria-label`/tooltip já em pt-BR, consistente com o resto do app).

## Decisões Arquiteturais

### D1. Tooltip construído manualmente sobre `radix-ui`, não via CLI shadcn

- **Contexto:** o projeto não tem componente `Tooltip`. Duas rotas possíveis: `npx shadcn@latest add tooltip`, ou construir à mão sobre o pacote `radix-ui` (já instalado, versão unificada v1.4.3).
- **Decisão:** construir manualmente, seguindo a convenção existente em `apps/frontend/src/components/ui/` (cva + `cn()` + Radix primitives), como `dropdown-menu.tsx` e `button.tsx` já fazem.
- **Justificativa técnica:** o projeto não usa a CLI do shadcn em nenhum componente existente — todos são hand-built. Usar a CLI aqui introduziria um único componente com convenção divergente do resto de `ui/`.
- **Justificativa de negócio:** menor risco de inconsistência visual/manutenção; zero dependência nova.
- **Trade-offs aceitos:** mais código escrito à mão (Provider/Trigger/Content) do que copiar o registry do shadcn.

### D2. Mapeamento de ícones centralizado (status→ícone, ação→ícone)

- **Contexto:** os ícones de status/ação seriam necessários em pelo menos 4 componentes (`StatusBadge`, `user-actions-footer.tsx`, `more-actions-menu.tsx`, `gym-row.tsx`, `check-in-actions.tsx`).
- **Decisão:** criar um único arquivo de mapeamento (`apps/frontend/src/components/ui/status-icon.ts`) reaproveitado por todos esses componentes, em vez de literais de ícone duplicados em cada um.
- **Justificativa técnica:** ponto único de mudança se um ícone precisar trocar; evita divergência (ex.: um componente usando `Ban` e outro `CircleSlash` para o mesmo conceito de "inativo").
- **Justificativa de negócio:** reduz custo de manutenção futura quando novas áreas do admin adotarem o mesmo padrão.
- **Trade-offs aceitos:** um nível de indireção a mais para quem for ler o código de um componente isolado.

### D3. `StatusBadge` generalizado para aceitar o vocabulário de academias

- **Contexto:** `gym-row.tsx` hoje renderiza um `<span>` bespoke com dot+texto ("Disponível"/"Desativada"), sem reaproveitar o `StatusBadge` compartilhado (que só conhece o vocabulário de usuário: Ativo/Inativo/Bloqueado).
- **Decisão:** estender `StatusBadge` para aceitar também os rótulos/tons de academia, e migrar `gym-row.tsx` para usá-lo, removendo o markup bespoke.
- **Justificativa técnica:** consolida toda badge de status do admin em um único componente com o ícone já embutido, em vez de duplicar a lógica de ícone em `gym-row.tsx`.
- **Justificativa de negócio:** convenção já estabelecida no projeto (recuperada de decisão anterior, feature `responsividade-mobile-admin-usuarios`) de preferir estender um componente existente com prop/variant a duplicar.
- **Trade-offs aceitos:** `StatusBadge` passa a carregar dois vocabulários (usuário + academia) no mesmo componente — aceitável porque ambos compartilham a mesma forma visual (pill, tom, ícone), só o texto difere.

### D4. Escopo por área: usuários (completo) · academias (só badge) · check-ins (só ações)

- **Contexto:** inventário mostrou que academias e check-ins não replicam o padrão de usuários 1:1 — em academias o botão de editar já é ícone-só, e em check-ins o badge de status já é ícone-só sem texto.
- **Decisão:** aplicar apenas onde há trabalho real: badge de status em academias (texto→ícone+texto); botões Aprovar/Rejeitar em check-ins (migrar de `<button>` cru para `Button` compartilhado, ícone-só+tooltip).
- **Justificativa técnica:** evita retrabalho em componentes que já estão no estado-alvo (editar de academia) ou que já são mais compactos que o próprio pedido (badge de check-in).
- **Justificativa de negócio:** foca esforço onde reduz verbosidade de fato, sem inventar trabalho.
- **Trade-offs aceitos:** nenhum — é a leitura correta do estado atual, não uma concessão.

## Especificação Visual

**Artefato curado:** `specs/mockups/admin-semantic-icons-visual.md`

**Fonte de design original:** nenhuma — layout definido via mockup do companion de brainstorming, aprovado interativamente pelo usuário.

**Decisões visuais (norte, não pixel-final):** ver artefato curado — resume ícones escolhidos, tratamento de Tooltip e tokens do tema aplicados.

**Fidelidade:** o mockup é um norte; a implementação final usa os componentes reais (`Button`, `StatusBadge`, `Tooltip` novo) e os ícones reais de `lucide-react`.

## Estrutura de Componentes

**Novos:**
- `apps/frontend/src/components/ui/tooltip.tsx` — `TooltipProvider`/`Tooltip`/`TooltipTrigger`/`TooltipContent`, wrapper manual sobre `radix-ui`.
- `apps/frontend/src/components/ui/status-icon.ts` — mapa `status → componente de ícone` e `ação → componente de ícone` (fonte única).

**Modificados:**
- `apps/frontend/src/app/layout.tsx` (ou o layout do grupo `(authenticated)`) — adiciona `TooltipProvider` no topo da árvore.
- `apps/frontend/src/components/ui/status-badge.tsx` — troca o dot por ícone (via `status-icon.ts`); aceita o vocabulário de academia.
- `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx` — botão "Editar dados" vira ícone-só + Tooltip.
- `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx` — só o trigger "Mais ações" vira ícone-só + Tooltip; itens internos do dropdown continuam em texto.
- `apps/frontend/src/features/gyms/components/gym-row.tsx` — badge de status migra do `<span>` bespoke para `StatusBadge`.
- `apps/frontend/src/features/check-ins/components/check-in-actions.tsx` — botões Aprovar/Rejeitar migram de `<button>` cru para `Button size="icon"` + Tooltip.

**Sem alteração (confirmado no inventário/interview):**
- `RoleBadge` (Membro/Admin) — mantém texto.
- Itens internos do `DropdownMenu` de "Mais ações" — mantêm texto.
- `gym-row.tsx` botão de editar — já é ícone-só.
- `check-in-item.tsx` chip de status — já é ícone-só sem texto.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `TooltipProvider` mal posicionado no layout quebra tooltips em páginas que não passam pelo layout raiz esperado | 2 | 1 | 2 🟢 | Task de implementação valida manualmente em `/admin/usuarios`, academias e check-ins antes de fechar |
| Migração de `gym-row.tsx` para `StatusBadge` altera sutilmente o visual (tom/padding) de um componente já em produção | 2 | 2 | 4 🟡 | Screenshot antes/depois na task de implementação; revisão visual explícita no code review |
| Ícone-só sem `aria-label`/Tooltip escapa de algum botão convertido | 2 | 1 | 2 🟢 | Checklist de acessibilidade (aria-label + tooltip) como critério de aceite por task, verificado no gate de qualidade |

## Testes

- Testes de componente (`*.test.tsx`, descrições em pt-BR, `test()` nunca `it`) para `Tooltip`, `StatusBadge` (ambos vocabulários), e cada botão convertido — cobrindo presença de `aria-label` e do texto do tooltip.
- Sem mudança de contrato de API — sem necessidade de testes de backend.

## Fora de Escopo

- Mudanças de backend/API.
- `RoleBadge` (Membro/Admin) — decidido manter texto.
- Itens internos do dropdown "Mais ações".
- Botão de editar de academias (já ícone-só) e chip de status de check-ins (já ícone-só sem texto) — nenhuma mudança necessária.
- Novas telas admin além de usuários/academias/check-ins (ex.: analytics, notificações) — fora desta entrega.
