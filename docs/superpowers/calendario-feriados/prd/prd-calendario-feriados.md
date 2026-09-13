---
created_at: "2026-09-13T18:32:36.384-03:00"
updated_at: "2026-09-13T18:32:36.384-03:00"
---

# PRD: Calendario de Feriados

## Visão Geral

Usuários autenticados precisam consultar feriados nacionais brasileiros dentro da área logada sem sair do app. A feature adiciona uma entrada **Calendario** no menu principal e uma tela dedicada para visualizar feriados por ano, usando dados públicos de feriados nacionais sem criar backend próprio.

## Objetivos

- Permitir que um usuário logado encontre a tela de calendário a partir da navegação principal.
- Exibir feriados nacionais do ano atual por padrão e permitir alternar entre anos.
- Manter a experiência utilizável quando a fonte pública de dados estiver carregando ou indisponível.
- Preservar a fronteira técnica: nenhuma API, persistência ou contrato backend próprio para esta feature.

## Histórias de Usuário

- **US-01** — Como usuário logado, eu quero acessar Calendario pelo menu principal para consultar feriados sem sair da area logada · **UI:** sim
- **US-02** — Como usuário logado, eu quero visualizar os feriados nacionais do ano selecionado para planejar minhas atividades · **UI:** sim
- **US-03** — Como usuário logado, eu quero navegar entre anos para consultar feriados passados ou futuros · **UI:** sim
- **US-04** — Como usuário logado, eu quero entender quando os feriados não puderem ser carregados e tentar novamente para não confundir falha externa com ausência de feriados · **UI:** sim

## Funcionalidades Principais

- **FR-001** (US-01) — O sistema deve exibir um item **Calendario** na navegação principal da área logada.
- **FR-002** (US-01) — O sistema deve abrir uma rota autenticada `/calendario` ao acionar o item **Calendario**.
- **FR-003** (US-01) — O sistema deve indicar visualmente que **Calendario** está ativo quando o usuário estiver na rota `/calendario`.
- **FR-004** (US-02) — O sistema deve exibir os feriados nacionais brasileiros do ano selecionado.
- **FR-005** (US-02) — O sistema deve iniciar a tela usando o ano atual como seleção padrão.
- **FR-006** (US-03) — O sistema deve permitir navegar para o ano anterior e para o próximo ano.
- **FR-007** (US-03) — O sistema deve atualizar a lista/calendário de feriados quando o ano selecionado mudar.
- **FR-008** (US-04) — O sistema deve mostrar estado de carregamento enquanto busca os feriados.
- **FR-009** (US-04) — O sistema deve mostrar uma mensagem de erro recuperável quando os feriados não puderem ser carregados.
- **FR-010** (US-04) — O sistema deve oferecer uma ação de tentar novamente após erro de carregamento.
- **FR-011** (US-01, US-02, US-03, US-04) — O sistema não deve exigir backend próprio, novo endpoint, migração, persistência ou alteração de contrato OpenAPI para entregar esta feature.

## Experiência do Usuário

O usuário logado vê **Calendario** na seção principal da sidebar, no mesmo padrão visual dos demais itens. Ao acessar a tela, encontra um cabeçalho com o contexto de feriados nacionais, o ano selecionado e controles para navegar entre anos. Os feriados do ano selecionado aparecem em uma visualização de calendário/lista consistente com o design system VOLT. Se os dados estiverem carregando, a tela comunica progresso; se a consulta falhar, a navegação permanece disponível e o usuário recebe uma ação clara de retry.

As decisões visuais aprovadas estão registradas em `docs/superpowers/calendario-feriados/specs/mockups/calendario-feriados-visual.md`.

## Restrições Técnicas de Alto Nível

- A fonte dos feriados deve ser pública e consumida sem backend próprio do app.
- A primeira versão cobre apenas feriados nacionais brasileiros.
- A feature deve preservar o shell autenticado existente, incluindo comportamento de sidebar colapsada e mobile já definido por features anteriores.
- A disponibilidade percebida deve ser protegida por estados de loading, erro e retry.
- A manutenibilidade exige que nenhum schema backend, endpoint próprio, tipo OpenAPI gerado ou persistência sejam alterados para esta feature.

## Fora de Escopo

- Feriados estaduais, municipais ou personalizados.
- Edição, criação ou importação manual de eventos.
- Sincronização com calendário externo.
- Dataset estático local ou fallback offline nesta primeira versão.
- Backend próprio, endpoint proxy, cache server-side, migração de banco ou alteração de autenticação.
- Mudanças no drawer/mobile/off-canvas da navegação.
