---
created_at: "2026-08-07T18:25:21-03:00"
updated_at: "2026-08-07T20:19:03-03:00"
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

- **Contexto:** o projeto não tem componente `Tooltip`. Duas rotas possíveis: `npx shadcn@latest add tooltip`, ou construir à mão sobre o pacote `radix-ui` (já instalado, versão unificada v1.4.3, que re-exporta `Tooltip` de `@radix-ui/react-tooltip` sem exigir instalação adicional). O projeto já existe `apps/frontend/components.json` (setup inicial da CLI do shadcn), mas nenhum componente atual foi de fato gerado por ela — todos em `ui/` seguem o padrão manual `forwardRef` + `cn()`, divergente do output atual do shadcn CLI (`function` + `data-slot`).
- **Decisão:** construir manualmente, seguindo a convenção existente em `apps/frontend/src/components/ui/` (`cn()` + Radix primitives, com `cva` quando há variantes de estilo) — como `dropdown-menu.tsx` (sem `cva`, só `forwardRef`+`cn()`+Radix) e `button.tsx` (com `cva`, via `buttonVariants`) já fazem, cada um com o subconjunto do padrão que seu componente precisa.
- **Justificativa técnica:** rodar a CLI aqui introduziria um único componente com convenção divergente do resto de `ui/` (`function`+`data-slot` vs. `forwardRef`+`cn()`).
- **Justificativa de negócio:** menor risco de inconsistência visual/manutenção; zero dependência nova.
- **Trade-offs aceitos:** mais código escrito à mão (Provider/Trigger/Content) do que copiar o registry do shadcn.
- **Precedente reconciliado:** `apps/frontend/src/components/layout/authenticated-shell.tsx` já tem um padrão funcional de "rótulo em hover/foco" (`CollapsedTooltip`, via `group-hover/nav:block group-focus-visible/nav:block` + `aria-hidden="true"`, zero dependência). Ele não é reaproveitado aqui porque é puramente decorativo/`aria-hidden` (não tem `role="tooltip"`/`aria-describedby`) — não serve como tooltip textual acessível "real", que é o requisito do FR-008. O Tooltip novo (Radix) é o único mecanismo de tooltip textual do app; o `CollapsedTooltip` do sidebar continua sendo um padrão CSS-only à parte, para o caso mais restrito de rótulo de navegação colapsada.

### D2. Mapeamento de ícones centralizado (status→ícone, ação→ícone)

- **Contexto:** os ícones de status/ação seriam necessários em pelo menos 4 componentes (`StatusBadge`, `user-actions-footer.tsx`, `more-actions-menu.tsx`, `gym-row.tsx`, `check-in-actions.tsx`).
- **Decisão:** criar um único arquivo de mapeamento (`apps/frontend/src/components/ui/status-icon.ts`) reaproveitado por todos esses componentes, em vez de literais de ícone duplicados em cada um.
- **Justificativa técnica:** ponto único de mudança se um ícone precisar trocar; evita divergência (ex.: um componente usando `Ban` e outro `CircleSlash` para o mesmo conceito de "inativo").
- **Justificativa de negócio:** reduz custo de manutenção futura quando novas áreas do admin adotarem o mesmo padrão.
- **Trade-offs aceitos:** um nível de indireção a mais para quem for ler o código de um componente isolado.
- **Garantia do par `aria-label`+`Tooltip` (FR-008) — fechado sem mecanismo novo (achado da revisão de spec):** ao contrário do mapeamento de ícone (que D2 centraliza), o par `aria-label`+`Tooltip` não ganha um componente/wrapper dedicado que force a presença de ambos. Decisão: manter como checklist de aceite por task + teste de componente por botão, sem criar um wrapper obrigatório (ex.: `IconActionButton`) — são só 3 componentes consumidores nesta entrega, e a garantia por processo (teste dedicado a cada FR-008 por task) é suficiente para o escopo atual. Se uma quarta área do admin adotar o mesmo padrão futuramente, reavaliar se um wrapper compartilhado passa a compensar.

### D3. `StatusBadge` generalizado para aceitar o vocabulário de academias

- **Contexto:** `gym-row.tsx` (view em lista) e `gym-card.tsx` (view em grid — alternada com `gym-row.tsx` na mesma listagem de academias via `gym-results.tsx`, ambas recebendo o mesmo `adminEditHref`/`gym.status`) hoje renderizam, cada uma, um `<span>` bespoke com dot+texto ("Disponível"/"Desativada"), sem reaproveitar o `StatusBadge` compartilhado (que só conhece o vocabulário de usuário: Ativo/Inativo/Bloqueado). Em ambos os arquivos, "Desativada" só aparece quando há `adminEditHref` (contexto admin) **e** `status === "deactivated"` — em contexto público (sem `adminEditHref`), o badge sempre mostra "Disponível", mesmo que a academia esteja desativada; é uma regra condicional ao contexto, não uma função pura do `status`.
- **Decisão:** estender `StatusBadge` para aceitar também os rótulos/tons de academia — sem props novas de "domínio": o componente continua recebendo só `tone` (`"success" | "warning" | "danger" | "neutral"`) + `children` (texto livre), e quem chama decide tom e texto. Migrar `gym-row.tsx` e `gym-card.tsx` para usá-lo, removendo o markup bespoke de ambos e preservando, em cada um, a mesma regra condicional `isDeactivated = adminEditHref && status === "deactivated"` já existente — o comportamento funcional da listagem não muda (FR-005).
- **Correção de contrato incluída (achado da revisão de spec):** o mapeamento real de tom→ícone (`status-icon.ts`, D2) só cobre os tons `success`/`warning`/`danger` — `neutral` fica sem ícone dedicado, por decisão explícita (fallback documentado, sem quebrar consumidores fora do vocabulário desta feature). Isso expôs um bug pré-existente: `apps/frontend/src/features/admin/components/user-row.tsx` resolve o status `"suspended"` ("Inativo") para `tone="neutral"` — que ficaria sem ícone, violando o próprio FR-003 ("ícone semântico distinto para cada estado") e a decisão visual do mockup ("Inativo/Desativada → CircleSlash"). Esta feature corrige esse mapeamento: `statusTone("suspended")` passa a retornar `"danger"` (alinhado ao ícone `CircleSlash`), não `"neutral"`.
- **Justificativa técnica:** consolida toda badge de status do admin em um único componente com o ícone já embutido, em vez de duplicar a lógica de ícone em `gym-row.tsx`/`gym-card.tsx`.
- **Justificativa de negócio:** convenção já estabelecida no projeto (recuperada de decisão anterior, feature `responsividade-mobile-admin-usuarios`) de preferir estender um componente existente com prop/variant a duplicar.
- **Trade-offs aceitos:** `StatusBadge` passa a carregar dois vocabulários (usuário + academia) no mesmo componente — aceitável porque ambos compartilham a mesma forma visual (pill, tom, ícone), só o texto difere.
- **Consumidor adicional confirmado (achado da revisão de spec):** `StatusBadge` também é usado hoje em `apps/frontend/src/app/(authenticated)/perfil/page.tsx` (tela de perfil do próprio usuário, fora das três áreas admin do escopo desta feature). A generalização de ícone se aplica automaticamente lá também, por ser aditiva — aceito como efeito colateral esperado (não uma regressão: perfil ganha o mesmo ícone semântico), sem exigir teste dedicado nesta feature além de uma checagem visual manual pontual.

### D4. Escopo por área: usuários (completo) · academias (só badge) · check-ins (só ações)

- **Contexto:** inventário mostrou que academias e check-ins não replicam o padrão de usuários 1:1 — em academias o botão de editar já é ícone-só, e em check-ins o badge de status já é ícone-só sem texto.
- **Decisão:** aplicar apenas onde há trabalho real: badge de status em academias (texto→ícone+texto); botões Aprovar/Rejeitar em check-ins (migrar de `<button>` cru para `Button` compartilhado, ícone-só+tooltip).
- **Justificativa técnica:** evita retrabalho em componentes que já estão no estado-alvo (editar de academia) ou que já são mais compactos que o próprio pedido (badge de check-in).
- **Justificativa de negócio:** foca esforço onde reduz verbosidade de fato, sem inventar trabalho.
- **Trade-offs aceitos:** nenhum — é a leitura correta do estado atual, não uma concessão.
- **Estado pendente de Aprovar/Rejeitar (achado da revisão de spec):** hoje o `<button>` nativo troca o TEXTO para "Aprovando..."/"Rejeitando..." durante o envio — pista visual de qual ação está em voo para o usuário vidente. Ao virar ícone-só, `aria-label`/tooltip dinâmicos preservam essa informação para leitor de tela e hover, mas os dois ícones ficam com a mesma aparência `disabled` simultaneamente (o `isLoading` que desabilita ambos já existia antes). Decisão: o ícone do botão que está de fato pendente troca para um spinner (`Loader2` do `lucide-react`, `animate-spin`), repondo a pista visual para o usuário vidente sem precisar de texto.

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
- `apps/frontend/src/app/providers.tsx` — adiciona `TooltipProvider` como camada mais externa da árvore de providers (decisão fechada: não `app/layout.tsx` nem `(authenticated)/layout.tsx` diretamente — `providers.tsx` é montado por `app/layout.tsx` e cobre igualmente rotas admin e não-admin, incluindo `/check-ins`, que também renderiza `CheckInActions` para usuários com papel admin).
- `apps/frontend/src/components/ui/status-badge.tsx` — troca o dot por ícone (via `status-icon.ts`); aceita o vocabulário de academia.
- `apps/frontend/src/features/admin/components/user-row.tsx` — corrige `statusTone()`: status `"suspended"` ("Inativo") passa de `tone="neutral"` (sem ícone) para `tone="danger"` (ícone `CircleSlash`), fechando a lacuna do FR-003 para esse status.
- `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx` — botão "Editar dados" vira ícone-só + Tooltip.
- `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx` — só o trigger "Mais ações" vira ícone-só + Tooltip; itens internos do dropdown continuam em texto.
- `apps/frontend/src/features/gyms/components/gym-row.tsx` (view em lista) — badge de status migra do `<span>` bespoke para `StatusBadge`.
- `apps/frontend/src/features/gyms/components/gym-card.tsx` (view em grid, mesma listagem) — mesma migração de badge, preservando o posicionamento em overlay sobre a imagem.
- `apps/frontend/src/features/check-ins/components/check-in-actions.tsx` — botões Aprovar/Rejeitar migram de `<button>` cru para `Button size="icon"` + Tooltip; ícone troca para `Loader2`/`animate-spin` durante o estado pendente do próprio botão (ver D4).

**Impactado indiretamente (consumidor existente de `StatusBadge`, fora das 3 áreas do escopo):**
- `apps/frontend/src/app/(authenticated)/perfil/page.tsx` — recebe o ícone semântico automaticamente por ser consumidor de `StatusBadge`; mudança aditiva, aceita como efeito colateral esperado (ver D3).

**Sem alteração (confirmado no inventário/interview):**
- `RoleBadge` (Membro/Admin) — mantém texto.
- Itens internos do `DropdownMenu` de "Mais ações" — mantêm texto.
- `gym-row.tsx`/`gym-card.tsx` botão de editar — já é ícone-só em ambos.
- `check-in-item.tsx` chip de status — já é ícone-só sem texto.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `TooltipProvider` montado no lugar errado quebra tooltips em rotas que não passam por ele | 2 | 1 | 2 🟢 | Decisão fechada: `TooltipProvider` é montado em `apps/frontend/src/app/providers.tsx` (camada mais externa), não em um layout específico — cobre por construção todas as rotas, incluindo `/check-ins` (não-admin) e `/admin/check-ins`. Task de implementação valida manualmente em `/admin/usuarios`, `/academias`, `/check-ins` e `/admin/check-ins` antes de fechar |
| Migração de `gym-row.tsx`/`gym-card.tsx` para `StatusBadge` altera sutilmente o visual (tom/padding) de um componente já em produção, ou quebra a regra condicional `adminEditHref && status === "deactivated"` (badge "Desativada" só em contexto admin) | 3 | 2 | 6 🟡 | Screenshot antes/depois na task de implementação (ambas as views, lista e grid); revisão visual explícita no code review; teste de componente automatizado confirmando o uso de `StatusBadge` (com ícone) nas duas views, preservando a regra condicional existente |
| Ícone-só sem `aria-label`/Tooltip escapa de algum botão convertido | 2 | 1 | 2 🟢 | Checklist de acessibilidade (aria-label + tooltip) como critério de aceite por task, verificado no gate de qualidade |
| Mapeamento tom→ícone incompleto deixa um status sem ícone semântico (ex.: "Inativo"/`suspended` resolvia para `tone="neutral"`, fora do mapa de `STATUS_ICON`) | 3 | 2 | 6 🟡 | `statusTone()` em `user-row.tsx` corrigido para retornar `"danger"` no caso `"suspended"` (ver D3); teste de componente cobrindo especificamente o status "Inativo" |

## Testes

- Testes de componente (`*.test.tsx`, descrições em pt-BR, `test()` nunca `it`) para `Tooltip`, `StatusBadge` (ambos vocabulários), e cada botão convertido — cobrindo presença de `aria-label` e do texto do tooltip.
- Cobertura automatizada do risco de maior score (migração de `gym-row.tsx`/`gym-card.tsx`): teste de componente confirmando que a badge renderizada usa `StatusBadge` (presença de ícone `<svg>`) nas duas views, e que a regra condicional `adminEditHref && status === "deactivated"` continua determinando o rótulo — não só a mitigação manual de screenshot.
- Cobertura automatizada do mapeamento tom→ícone: teste específico para o status "Inativo" (`user-row.tsx`) confirmando que resolve para um ícone semântico, não fica sem ícone.
- Teste do estado pendente de Aprovar/Rejeitar: confirma que só o botão de fato pendente troca seu ícone para o spinner (`Loader2`/`animate-spin`), o outro mantém o ícone normal.
- Sem mudança de contrato de API — sem necessidade de testes de backend.

## Fora de Escopo

- Mudanças de backend/API.
- `RoleBadge` (Membro/Admin) — decidido manter texto.
- Itens internos do dropdown "Mais ações".
- Botão de editar de academias (já ícone-só) e chip de status de check-ins (já ícone-só sem texto) — nenhuma mudança necessária.
- Novas telas admin além de usuários/academias/check-ins (ex.: analytics, notificações) — fora desta entrega.
