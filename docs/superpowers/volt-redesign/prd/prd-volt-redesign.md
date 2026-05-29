---
created_at: "2026-05-29T11:11:26-03:00"
updated_at: "2026-05-29T11:11:26-03:00"
---

# PRD: VOLT Redesign

## Visão Geral

Rebranding completo da plataforma (GymPass → **VOLT**) acompanhado do redesign
visual do frontend, fiel aos mockups gerados no Claude Design. O problema que
resolve: a identidade atual (indigo/violet/teal "Superhumon", marca "GymPass") não
reflete a nova marca **VOLT** — estética atlética, de alto contraste, com accent
verde-esmeralda. O público são os dois perfis já existentes da aplicação: o
**membro** (acessa academias, faz check-ins, gere perfil e assinatura) e o
**administrador** (gere usuários e check-ins). Importa porque consolida a
identidade visual da marca e moderniza a experiência sem alterar funcionalidade
ou backend.

## Objetivos

- Substituir 100% das referências de marca visíveis "GymPass" por "VOLT"
  (wordmark/logo, header, footer, metadados de página).
- Aplicar a paleta, tipografia e tokens VOLT em todas as telas mockadas, com
  `dark` como tema padrão e `light` disponível via toggle.
- Reconstruir as 7 telas mockadas (login, dashboard, admin usuários, admin
  check-ins, perfil, assinatura, academias) fiéis ao design, mantendo a
  funcionalidade existente.
- Garantir responsividade nos breakpoints definidos (sidebar → icon-rail/drawer,
  login → coluna única, grids fluidos) — sem quebra de layout em mobile.
- Atender critérios de acessibilidade AA+ nos dois temas (contraste, alvos
  ≥44px, foco visível).
- Critério de aceite técnico: `pnpm biome:fix`, `pnpm tsc:check`,
  `pnpm test:run` e `pnpm build` passando 100%.

## Histórias de Usuário

- **HU-01** — Como **visitante**, quero ver a marca VOLT na tela de login e nas
  páginas públicas, para reconhecer a identidade da plataforma.
- **HU-02** — Como **visitante**, quero fazer login em uma tela VOLT (split
  marca/formulário, com opção Google), para entrar na plataforma.
- **HU-03** — Como **membro autenticado**, quero navegar por uma sidebar VOLT
  (com grupos Principal/Admin quando aplicável) e topbar, para acessar as seções.
- **HU-04** — Como **membro**, quero ver meu dashboard com KPIs, gráfico semanal,
  ranking de academias e atividade recente no visual VOLT, para acompanhar meu uso.
- **HU-05** — Como **membro**, quero ver minha página de perfil (card com banner,
  avatar e streak) no visual VOLT, para visualizar e editar meus dados.
- **HU-06** — Como **membro**, quero ver a página de assinatura (banner do plano
  ativo + grade de planos) no visual VOLT, para entender meu plano.
- **HU-07** — Como **membro**, quero ver a listagem de academias (grade de cards
  com status, rating e ação de check-in) no visual VOLT, para encontrar onde treinar.
- **HU-08** — Como **administrador**, quero gerir usuários em uma tela VOLT
  (filtros segmentados, busca, lista de usuários com badge de role) preservando a
  funcionalidade atual, para administrar a base.
- **HU-09** — Como **administrador**, quero gerir check-ins em uma tela VOLT
  (filtros segmentados, ações inline aprovar/rejeitar/reverter) preservando a
  funcionalidade atual, para moderar check-ins.
- **HU-10** — Como **qualquer usuário**, quero alternar entre tema claro e escuro
  (toggle no shell), para usar a interface conforme minha preferência.
- **HU-11** — Como **usuário em dispositivo móvel/estreito**, quero que a
  interface se adapte (sidebar colapsada/drawer, login em coluna única, grids em
  reflow), para usar a plataforma sem quebra de layout.

## Funcionalidades Principais

### F1 — Camada de tokens e tema VOLT
Substitui o sistema de design por tokens VOLT, mantendo nomes semânticos
consumidos pelos componentes.
- **RF-001**: O sistema deve aplicar a paleta VOLT (accent `#39e58c`, neutros
  dark/light, tokens de sidebar dedicados, status colors) via tokens semânticos.
- **RF-002**: O tema padrão da aplicação deve ser `dark`; o `light` deve
  permanecer disponível e selecionável.
- **RF-003**: A sidebar deve usar a rampa escura em ambos os temas (tokens
  dedicados), independentemente do tema ativo.
- **RF-004**: Nenhum texto deve ser renderizado em branco sobre o accent; o
  foreground sobre accent deve ser near-black.
- **RF-005**: Os valores de accent, raio e densidade devem ser fixos (sem painel
  de customização em runtime).

### F2 — Tipografia
- **RF-006**: A aplicação deve carregar as fontes Space Grotesk (display/números),
  Inter (corpo) e JetBrains Mono (eyebrows, IDs, KPIs, timestamps, preços).
- **RF-007**: Números, IDs, contagens e timestamps devem ser renderizados em fonte
  mono com numerais tabulares.

### F3 — Branding GymPass → VOLT
- **RF-008**: Toda referência de marca visível "GymPass" deve ser substituída por
  "VOLT" (wordmark/logo com marca raio, textos de header/footer).
- **RF-009**: Os metadados de página (`<title>`, `description`) devem refletir a
  marca VOLT.
- **RF-010**: Referências internas em código/comentários devem ser renomeadas para
  VOLT onde aplicável, sem renomear o workspace `frontend` do monorepo.

### F4 — Shell autenticado e público
- **RF-011**: O shell autenticado deve apresentar sidebar dark fixa (brand →
  grupos de nav com labels mono → user-chip + logout) e topbar sticky (search-bar,
  toggle de tema, sino com indicador, avatar).
- **RF-012**: O item de navegação ativo deve ser destacado como pill preenchida.
- **RF-013**: As seções de navegação Admin devem aparecer apenas para
  administradores.
- **RF-014**: O shell público deve apresentar header e footer com a marca VOLT.

### F5 — Telas (redesign fiel, funcionalidade preservada)
- **RF-015**: A tela de login deve apresentar layout split (painel-marca dark +
  formulário) com email/senha, botão primário accent e login Google.
- **RF-016**: O dashboard deve apresentar grade de 4 KPIs, gráfico semanal,
  ranking de academias e lista de atividade recente.
- **RF-017**: A tela de admin usuários deve apresentar page-header, filtros
  segmentados com contadores, busca, lista de usuários com badge de role e status,
  preservando a funcionalidade existente de gestão de usuários/roles.
- **RF-018**: A tela de admin check-ins deve apresentar filtros segmentados e
  ações inline (aprovar/rejeitar/reverter), preservando a funcionalidade existente.
- **RF-019**: A tela de perfil deve apresentar profile-card (banner + avatar) e
  metric-card com streak.
- **RF-020**: A tela de assinatura deve apresentar banner do plano ativo e grade
  de planos com destaque do plano atual.
- **RF-021**: A tela de academias deve apresentar grade de cards com status
  aberto/fechado, rating, tags e ação de check-in.

### F6 — Responsividade
- **RF-022**: Abaixo de 860px, a sidebar deve colapsar para icon-rail (76px) e, em
  mobile, ser acessível via overlay/drawer.
- **RF-023**: Abaixo de 860px, o login deve exibir apenas o formulário em coluna
  única.
- **RF-024**: As grades (KPIs, planos, academias, dashboard) devem fazer reflow
  fluido (4→2→1 colunas) conforme a largura.
- **RF-025**: O conteúdo deve respeitar o limite máximo de 1180px centralizado.

### F7 — Movimento e acessibilidade
- **RF-026**: As animações devem ser transform-only e curtas; o estado-base deve
  ser sempre visível (sem animar de `opacity:0` com fill-mode persistente).
- **RF-027**: A aplicação deve respeitar `prefers-reduced-motion`.
- **RF-028**: Texto deve atender contraste AA+ nos dois temas; alvos de toque
  devem ter ≥44px; foco deve ser visível (anel accent-mix com offset).

## Experiência do Usuário

O membro entra por uma tela de login de alto contraste e é levado ao shell com
sidebar dark persistente e topbar com busca/toggle/notificações. Navega entre
dashboard (visão de uso), academias, perfil e assinatura — todos com cards de
cantos suaves, números grandes em mono e um único accent verde por tela. O admin
acessa adicionalmente as seções de gestão de usuários e check-ins, com filtros
segmentados e ações inline. Em telas estreitas, a sidebar colapsa e os grids
refluem. O toggle de tema permite alternar claro/escuro com persistência.
Acessibilidade: contraste AA+, foco visível, alvos generosos, respeito a
movimento reduzido.

## Restrições Técnicas de Alto Nível

- Preservar a stack atual (Next.js 16, Tailwind v4, shadcn/ui, next-themes) — sem
  novas dependências (gráficos em CSS/SVG).
- Nenhuma alteração de backend, API ou contrato de dados.
- Funcionalidade existente das features (auth, check-ins, academias, perfil,
  assinatura, admin) deve ser preservada — esta entrega é puramente visual/marca.
- Gate de qualidade obrigatório: lint, type-check, testes e build verdes.

## Fora de Escopo

- Painel de customização (tweaks) em runtime — defaults fixos.
- Mudanças de backend, API ou modelo de dados.
- Novas funcionalidades ou novos fluxos de admin.
- Novas bibliotecas (incluindo libs de gráfico).
- Renomeação do workspace `frontend` do monorepo.
