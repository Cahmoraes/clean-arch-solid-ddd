# PRD: Notas de Treino no Calendário

**Spec:** `../specs/notas-treino-calendario-design.md`

## Visão Geral

Quem treina quer anotar o treino do dia no calendário que já abre todo dia, sem app separado. Uma nota curta por data, privada, que persiste entre dispositivos e convive com os feriados na mesma célula.

## Objetivos

Os critérios de sucesso da spec valem (## Visão Geral).

## Histórias de Usuário

- **US-01** — Como usuário logado, eu quero anotar o treino do dia no calendário para lembrar o que fazer naquele dia
- **US-02** — Como usuário logado, eu quero editar a nota de um dia para corrigir o treino planejado
- **US-03** — Como usuário logado, eu quero excluir a nota de um dia com confirmação para remover um treino cancelado
- **US-04** — Como usuário logado, eu quero ver minhas notas junto dos feriados para planejar a semana completa
- **US-05** — Como usuário logado, eu quero que só eu veja minhas notas para manter meus treinos privados

## Funcionalidades Principais

- **FR-001** (US-01) — o sistema deve permitir criar uma nota de treino por dia (AC-01, INV-01)
- **FR-002** (US-02) — o sistema deve permitir editar a nota existente de um dia (AC-01)
- **FR-003** (US-03) — o sistema deve excluir a nota mediante confirmação, removendo-a da célula e da lista (AC-03, INV-03)
- **FR-004** (US-01, US-04) — o sistema deve exibir a nota junto ao nome do feriado quando coincidirem (AC-02)
- **FR-005** (US-01, US-03) — o sistema deve recusar texto vazio sem apagar nada (AC-04, INV-02)
- **FR-006** (US-05) — o sistema deve isolar as notas por conta, sem exibir notas de outros usuários (AC-05)
- **FR-007** (US-01, US-02) — o sistema deve manter o rascunho e oferecer retry quando a rede falhar ao salvar (AC-06)
- **FR-008** (US-01, US-02) — o sistema deve recusar a segunda nota do mesmo dia orientando a editar (AC-07, INV-01)
- **FR-009** (US-02, US-03) — o sistema deve avisar sem efeitos quando a nota alvo não existir (AC-08)
- **FR-010** (US-01, US-04) — o sistema deve manter as notas visíveis quando a leitura de feriados falhar (AC-09)

## Experiência do Usuário

Jornada: abrir o calendário → clicar no dia (vazio para criar, nota para editar) → modal com salvar/cancelar/excluir → confirmação antes de excluir → erro inline em texto vazio e retry em falha de rede, sem perder o digitado. Norte visual e decisões de layout: `../specs/mockups/notas-treino-calendario-visual.md` (ver ## Especificação Visual da spec).

## Fora de Escopo

As exclusões da spec valem (## Escopo).
