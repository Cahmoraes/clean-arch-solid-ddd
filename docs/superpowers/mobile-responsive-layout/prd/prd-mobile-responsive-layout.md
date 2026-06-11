---
created_at: "2026-06-03T15:38:07-03:00"
updated_at: "2026-06-03T15:38:07-03:00"
---

# PRD: Mobile Responsive Layout

## Visão Geral

A interface do sistema possui múltiplas telas com filtros, cards e gráficos que foram projetados primariamente para desktop. Em viewports mobile (<768px) esses elementos quebram para linhas extras, criam espaçamentos inconsistentes e comprometem a usabilidade de admins e membros que acessam o sistema pelo celular. Este PRD formaliza as melhorias necessárias para tornar quatro áreas críticas — filter bars, cards do dashboard e gráficos — totalmente funcionais em telas pequenas.

---

## Objetivos

- Todos os filtros de check-ins e usuários acessíveis em 375px sem scroll horizontal ou quebra de layout
- Espaçamento consistente entre componentes de filtro em todas as telas (padrão `gap-3`)
- Cards e gráficos do dashboard legíveis e usáveis em 375–768px
- Zero regressão nas telas desktop

---

## Histórias de Usuário

- **US-01** — Como admin, eu quero acessar os filtros da tela de check-ins em mobile para que eu possa filtrar registros sem precisar usar um computador
- **US-02** — Como admin, eu quero acessar os filtros da tela de usuários em mobile para que eu possa gerenciar usuários em qualquer dispositivo
- **US-03** — Como admin, eu quero ver qual filtro está ativo sem abrir o painel de filtros para que eu tenha contexto visual imediato
- **US-04** — Como membro, eu quero que a tela de meus check-ins tenha espaçamento consistente entre filtros e busca para que a interface pareça profissional e organizada
- **US-05** — Como membro, eu quero visualizar meu status de assinatura no dashboard em mobile para que eu saiba minha situação sem precisar de desktop
- **US-06** — Como membro, eu quero ver as estatísticas do meu perfil organizadas de forma legível em mobile para que eu acompanhe meu progresso no celular
- **US-07** — Como membro, eu quero que o gráfico de check-ins semanais seja visível em mobile para que eu visualize minha frequência em qualquer dispositivo

---

## Funcionalidades Principais

### 1. Filter Bar Mobile — Check-ins (Admin e Membro)

A barra de filtros da tela de check-ins exibe os filtros inline em desktop e colapsa para um painel acessível via botão em mobile.

**Por que importa:** Em 375px os filtros atuais quebram para múltiplas linhas, ocupando metade da tela e deslocando o conteúdo principal.

**Como funciona:** Um botão "Filtros" é exibido exclusivamente em mobile. Ao tocá-lo, um painel desliza do rodapé da tela contendo todos os filtros disponíveis, botões "Limpar" e "Aplicar", e um chip indicando o filtro ativo quando o painel está fechado.

**Requisitos funcionais:**
- **FR-001** — Em viewports <768px, a filter bar inline deve ser ocultada e um botão "Filtros" deve ser exibido no lugar
- **FR-002** — O botão "Filtros" deve abrir um painel a partir do rodapé contendo todos os filtros disponíveis na versão desktop
- **FR-003** — O painel deve conter botões "Limpar" (reseta os filtros) e "Aplicar" (persiste a seleção e fecha o painel)
- **FR-004** — Fechar o painel sem tocar "Aplicar" deve descartar as alterações feitas dentro do painel
- **FR-005** — Quando um filtro estiver ativo e o painel estiver fechado, um chip indicativo deve ser visível ao lado do botão "Filtros"
- **FR-006** — Em viewports ≥768px, o comportamento atual (filtros inline) deve permanecer inalterado

### 2. Filter Bar Mobile — Usuários (Admin)

Mesma experiência descrita na funcionalidade 1, aplicada à tela de listagem de usuários administradores.

**Requisitos funcionais:**
- **FR-007** — Os requisitos FR-001 a FR-006 se aplicam integralmente à filter bar da tela de usuários admin

### 3. Espaçamento — Check-ins Visão Membro

A tela de check-ins do membro possui um gap inconsistente entre a barra de filtros e a linha de busca/ordenação.

**Por que importa:** O espaçamento maior que o padrão cria uma inconsistência visual em relação a outras telas do sistema.

**Requisito funcional:**
- **FR-008** — O gap entre a filter bar e a linha busca/sort na tela de check-ins (visão membro) deve ser `gap-3`, igual ao padrão das demais telas

### 4. StatusDonutCard — Responsividade

O card de status de assinatura do dashboard exibe o gráfico donut e a legenda lado a lado. Em mobile esse layout fica comprimido.

**Por que importa:** Admins e membros consultam o status de assinatura com frequência; o card deve ser legível em qualquer viewport.

**Requisito funcional:**
- **FR-009** — Em viewports <768px, a legenda do StatusDonutCard deve ser posicionada abaixo do donut em layout de coluna
- **FR-010** — Em viewports ≥768px, o layout atual (donut e legenda lado a lado) deve ser mantido

### 5. ProfileHeroCard — Responsividade

O card de perfil do dashboard exibe avatar, informações e estatísticas em uma linha horizontal. Em mobile o bloco de estatísticas é empurrado para a direita de uma linha quebrada, criando desalinhamento.

**Requisitos funcionais:**
- **FR-011** — Em viewports <768px, o ProfileHeroCard deve empilhar avatar+nome em uma linha e as estatísticas em uma linha própria abaixo, centralizada e separada por uma borda superior
- **FR-012** — O comportamento de layout do desktop deve ser mantido em viewports ≥768px

### 6. Tipografia e Gráfico — Responsividade

Textos de destaque (PageHeader, StatCard, InlineStats) e o gráfico de frequência semanal utilizam tamanhos fixos que podem ser excessivos em mobile.

**Requisitos funcionais:**
- **FR-013** — Títulos de destaque no dashboard devem ter tamanho reduzido em mobile e tamanho atual mantido em desktop (escala responsiva)
- **FR-014** — O WeeklyChart deve ter altura reduzida em mobile para não dominar o viewport

---

## Experiência do Usuário

**Fluxo admin (filtros):**
1. Admin abre a tela de check-ins em mobile
2. Vê o botão "Filtros" + chip do filtro ativo (se houver)
3. Toca "Filtros" → painel desliza do rodapé
4. Seleciona o filtro desejado → toca "Aplicar"
5. Painel fecha, chip atualiza, lista recarrega com o filtro aplicado

**Fluxo membro (dashboard):**
1. Membro acessa o dashboard em mobile
2. O card de status exibe o donut com legenda abaixo — sem compressão
3. O card de perfil exibe avatar+nome em uma linha e estatísticas centralizadas na linha seguinte
4. O gráfico semanal é visível sem ocupar toda a altura do viewport

**Acessibilidade:**
- O painel de filtros deve ser fechável pelo botão Fechar e pela tecla `Escape`
- O painel deve ter `role="dialog"` e gerenciamento de foco automático (provido pelo Radix)

---

## Restrições Técnicas de Alto Nível

- **Frontend-only:** nenhuma mudança de backend, API ou banco de dados
- **Sem novas dependências:** o componente Sheet já está disponível via `@radix-ui/react-dialog`
- **Breakpoint único novo:** `md` (768px) para o toggle desktop/mobile; breakpoints customizados existentes mantidos
- **Zero hydration mismatch:** responsividade implementada exclusivamente via CSS (CSS classes toggle), sem JS de layout
- **Performance:** layout shifts ao abrir o Sheet devem ser imperceptíveis — zero JS no render inicial SSR

---

## Fora de Escopo

- Swipe-to-close no painel de filtros mobile
- Redesign das telas desktop
- Mudanças no sidebar ou shell de navegação
- Internacionalização ou localização de strings
- Novos breakpoints além dos já existentes no projeto + `md`
- Telas não mencionadas (ex: detalhe de usuário, detalhe de check-in)
- Qualquer mudança de backend
