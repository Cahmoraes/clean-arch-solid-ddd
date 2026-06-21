---
created_at: "2026-06-21T20:17:24-03:00"
updated_at: "2026-06-21T20:17:24-03:00"
---

# PRD: Sidebar Recolhível (Collapse/Expand)

## Visão Geral

Usuários autenticados (membros e administradores) trabalham com o menu lateral sempre em largura completa (268px), o que reduz o espaço útil de tela em telas largas. Esta feature dá ao usuário **controle para recolher e expandir o menu**: recolhido, vira um trilho de ícones (~76px) com tooltips; expandido, volta ao normal. A preferência é lembrada entre reloads e sessões. O recurso é desktop-only — em telas estreitas (≤860px) o app já força o trilho automaticamente, e isso permanece inalterado.

Inspiração de produto: o recolhimento de menu de Perplexity e claude.ai.

## Objetivos

- Dar mais espaço de tela sob demanda sem esconder a navegação (trilho de ícones permanece visível e clicável).
- Persistir a preferência de recolhimento sem flicker visível no carregamento.
- Manter acessibilidade integral em ambos os estados (nome acessível, tooltip, teclado).
- Zero regressão: lint, tsc, testes e build em 100%; comportamento mobile atual preservado.

**Métricas de sucesso:**
- Largura da sidebar alterna entre 268px (expandido) e ~76px (recolhido) ao acionar o controle.
- Após recolher e recarregar a página, o estado recolhido é mantido (sem flash de largura).
- Todos os itens recolhidos expõem nome acessível e tooltip no hover/focus.

## Histórias de Usuário

- **US-01** — Como usuário autenticado em desktop, eu quero recolher o menu lateral para que eu tenha mais espaço de tela para o conteúdo.
- **US-02** — Como usuário autenticado, eu quero expandir o menu novamente para que eu volte a ver os rótulos completos da navegação.
- **US-03** — Como usuário autenticado, eu quero que o app lembre se deixei o menu recolhido para que minha preferência persista entre reloads e sessões, sem piscada no carregamento.
- **US-04** — Como usuário com o menu recolhido, eu quero ver o nome de cada item ao passar o mouse ou focar pelo teclado para que eu reconheça os destinos mesmo só com ícones.
- **US-05** — Como usuário de teclado, eu quero alternar o menu com um atalho (`Cmd/Ctrl+B`) para que eu não dependa do mouse.
- **US-06** — Como usuário de leitor de tela, eu quero que o controle de recolher informe seu estado (recolhido/expandido) para que eu saiba o efeito da ação.
- **US-07** — Como usuário em telas estreitas (mobile/tablet ≤860px), eu quero que a navegação continue funcionando como hoje para que minha experiência não seja afetada por esta mudança.

## Funcionalidades Principais

### F1. Alternar recolher/expandir o menu
- **O que faz:** Um controle no menu lateral alterna entre estado expandido (268px) e recolhido (~76px, só ícones).
- **Por que importa:** É o coração da feature — dá espaço de tela sob demanda.
- **Como funciona (alto nível):** O controle inverte um estado de UI que dirige a largura e a visibilidade dos rótulos, com transição animada.
- **Requisitos funcionais:**
  - **FR-001** — O menu lateral DEVE oferecer um controle visível para recolher quando expandido e para expandir quando recolhido.
  - **FR-002** — Ao recolher, o menu DEVE exibir apenas os ícones de navegação (~76px) e ocultar os rótulos visuais.
  - **FR-003** — Ao expandir, o menu DEVE retornar à largura completa (268px) com rótulos visíveis.
  - **FR-004** — A transição entre os estados DEVE ser animada (sem salto abrupto de largura).

### F2. Persistência da preferência
- **O que faz:** Lembra o estado recolhido/expandido entre reloads e sessões.
- **Por que importa:** Recolher precisa ser uma preferência, não uma ação repetida a cada visita; e o carregamento não pode "piscar".
- **Como funciona (alto nível):** O estado é persistido e lido no servidor antes da primeira renderização, de modo que a página já carrega na largura correta.
- **Requisitos funcionais:**
  - **FR-005** — A preferência de recolhimento DEVE persistir entre reloads e novas sessões do mesmo navegador.
  - **FR-006** — No carregamento da página, o menu DEVE renderizar já no estado persistido, sem flash/flicker de largura.
  - **FR-007** — Na ausência de preferência salva (primeiro acesso), o menu DEVE iniciar expandido.

### F3. Acessibilidade em ambos os estados
- **O que faz:** Garante que recolher não degrade a usabilidade por teclado e leitor de tela.
- **Por que importa:** Ícones sem rótulo são irreconhecíveis e podem sumir da árvore de acessibilidade.
- **Como funciona (alto nível):** Itens recolhidos preservam nome acessível e ganham tooltip; o controle de toggle anuncia seu estado; há atalho de teclado.
- **Requisitos funcionais:**
  - **FR-008** — Cada item de navegação recolhido DEVE preservar um nome acessível (não pode depender apenas de ocultar o rótulo da árvore de acessibilidade).
  - **FR-009** — Cada item recolhido DEVE exibir um tooltip com seu rótulo no hover E no focus por teclado.
  - **FR-010** — O controle de toggle DEVE expor seu estado de forma acessível (recolhido/expandido) e um rótulo adequado à ação.
  - **FR-011** — O sistema DEVE permitir alternar o menu pelo atalho de teclado `Cmd/Ctrl+B`, sem conflitar com o atalho existente do command palette (`Cmd/Ctrl+K`).

### F4. Preservação do comportamento mobile
- **O que faz:** Mantém a navegação em telas estreitas exatamente como está hoje.
- **Por que importa:** A feature é desktop-only; mobile não deve regredir.
- **Como funciona (alto nível):** Em ≤860px o trilho continua forçado pela responsividade existente, independentemente da preferência do usuário.
- **Requisitos funcionais:**
  - **FR-012** — Em telas ≤860px o menu DEVE permanecer no trilho de ícones forçado atual, independentemente da preferência de recolhimento.
  - **FR-013** — A preferência de recolhimento do usuário DEVE ser preservada e voltar a valer ao retornar para uma viewport de desktop (≥861px).

## Experiência do Usuário

Jornada principal (desktop):
1. Usuário vê o menu expandido com rótulos.
2. Aciona o controle de recolher (clique ou `Cmd/Ctrl+B`) → o menu encolhe suavemente para o trilho de ícones; o conteúdo ganha espaço.
3. Passa o mouse/foco sobre um ícone → tooltip com o rótulo aparece.
4. Recarrega a página → o menu já carrega recolhido, sem piscar.
5. Aciona o controle novamente → o menu expande de volta.

**Considerações visuais (norte, detalhe em `../specs/mockups/sidebar-collapse-toggle-visual.md`):** trilho de ~76px só com ícones centralizados; pílula de item ativo (branca no tema claro, verde no escuro); botão chevron discreto na borda direita do menu; tooltip à direita do ícone só no estado recolhido. Tokens do design system existente (`--color-sidebar*`, `--color-primary`).

**Acessibilidade:** nome acessível preservado em itens recolhidos; tooltip no hover e focus; toggle com estado anunciado; navegação e ativação por teclado em ambos os estados.

## Restrições Técnicas de Alto Nível

Carregadas das Características Arquiteturais priorizadas na spec:

- **Usabilidade:** sem flicker de largura no reload; transição de largura animada; preferência sobrevive a reload e nova sessão.
- **Acessibilidade:** nome acessível para todo item recolhido; tooltip no hover e focus; toggle com estado acessível; alternância por teclado.
- **Manutenibilidade / baixo risco:** reuso do trilho e tokens existentes do `AuthenticatedShell`; sem reescrita do shell; lint/tsc/test/build em 100%.

## Fora de Escopo

- Ocultar totalmente a sidebar (modo off-canvas/0px) — descartado em favor do trilho de ícones.
- Gaveta (drawer overlay) no mobile — comportamento mobile permanece o atual.
- Persistência da preferência por usuário no backend (cross-device) — a persistência é por navegador.
- Reordenar, fixar ou personalizar itens do menu.
- Adoção do componente `Sidebar` do shadcn/ui.
- Recolhimento por seção/grupo de navegação.
